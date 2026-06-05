package app.samo.android.audio

import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.TimeUnit

/**
 * RN bridge for the Phase 5 catalog-sync scheduler. JS calls `schedule()`
 * once on app boot to install (or join) the periodic WorkManager job, and
 * `triggerNow()` from the sync-now button to fire an extra one-shot run on
 * top of the schedule. `cancel()` exists for tests + sign-out flows.
 *
 * The actual sync logic is JS (`syncSamoCatalog` in services/catalog/catalog-sync.ts);
 * Kotlin owns ONLY the scheduling + the HeadlessJsTaskService bridge that
 * brings up a React context out-of-process for the sync window.
 */
class SamoCatalogSyncModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "SamoCatalogSync"

    @ReactMethod
    fun schedule(promise: Promise) {
        try {
            val constraints =
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()

            val request =
                PeriodicWorkRequestBuilder<SamoCatalogSyncWorker>(
                    PERIODIC_INTERVAL_MINUTES,
                    TimeUnit.MINUTES,
                    // Flex window: WorkManager can fire anywhere in the last
                    // FLEX_MINUTES of each interval. Lets it batch with other
                    // periodic jobs for battery.
                    FLEX_MINUTES,
                    TimeUnit.MINUTES,
                )
                    .setConstraints(constraints)
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
                    .setInputData(Data.Builder().putString(SamoCatalogSyncWorker.KEY_TRIGGER_SOURCE, "periodic").build())
                    .build()

            // KEEP so the second + third call (which we expect on every app
            // launch) joins the existing schedule instead of restarting it —
            // important because REPLACE on a periodic request resets the
            // interval timer, which would defer the next run by 30 min every
            // time the app starts.
            WorkManager.getInstance(reactContext).enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("SamoCatalogSyncScheduleError", error)
        }
    }

    @ReactMethod
    fun triggerNow(promise: Promise) {
        try {
            val request =
                OneTimeWorkRequestBuilder<SamoCatalogSyncWorker>()
                    .setInputData(Data.Builder().putString(SamoCatalogSyncWorker.KEY_TRIGGER_SOURCE, "trigger-now").build())
                    .build()
            // APPEND_OR_REPLACE so a manual sync while another manual sync is
            // queued just refreshes the queued one — never piles up multiple
            // runs that would step on each other through the JS in-flight
            // dedupe map in catalog-sync.ts.
            WorkManager.getInstance(reactContext).enqueueUniqueWork(
                ONE_SHOT_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request,
            )
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("SamoCatalogSyncTriggerError", error)
        }
    }

    @ReactMethod
    fun cancel(promise: Promise) {
        try {
            val wm = WorkManager.getInstance(reactContext)
            wm.cancelUniqueWork(PERIODIC_WORK_NAME)
            wm.cancelUniqueWork(ONE_SHOT_WORK_NAME)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("SamoCatalogSyncCancelError", error)
        }
    }

    companion object {
        private const val PERIODIC_WORK_NAME = "samo-catalog-sync-periodic"
        private const val ONE_SHOT_WORK_NAME = "samo-catalog-sync-trigger"

        // 30 min matches what users expect from "background refresh" cadence.
        // WorkManager's floor is 15 min, so anything faster would just be the
        // floor with extra battery cost.
        private const val PERIODIC_INTERVAL_MINUTES = 30L
        private const val FLEX_MINUTES = 10L
    }
}

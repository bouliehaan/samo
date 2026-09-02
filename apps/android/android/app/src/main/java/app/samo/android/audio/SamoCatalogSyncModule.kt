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
 * RN bridge for the catalog-sync engine. JS calls `schedule()` once on app
 * boot to install (or join) the periodic WorkManager job, and `triggerNow()`
 * from connect / sync-now / pull-to-refresh to fire a one-shot run on top of
 * the schedule. `cancel()` exists for tests + sign-out flows.
 *
 * The sync itself is pure Kotlin (`SamoCatalogSync`) — fetch, cursor,
 * reconcile, FTS, detail crawls. While a React context is alive this module
 * forwards the engine's progress as `SamoCatalogSyncState` device events so
 * the Settings panel and the post-sync hooks (artwork prefetch, home
 * re-derive) can react live; background runs just write the sync-state table
 * and JS re-hydrates on the next foreground.
 */
class SamoCatalogSyncModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "SamoCatalogSync"

    init {
        SamoCatalogSyncEvents.emitter = { sourceId, status, items, tracks, details, error ->
            if (reactContext.hasActiveReactInstance()) {
                val map = com.facebook.react.bridge.Arguments.createMap()
                map.putString("sourceId", sourceId)
                map.putString("status", status)
                map.putDouble("items", items.toDouble())
                map.putDouble("tracks", tracks.toDouble())
                map.putDouble("details", details.toDouble())
                if (error != null) map.putString("error", error)
                reactContext
                    .getJSModule(
                        com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java,
                    )
                    .emit("SamoCatalogSyncState", map)
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

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
            // APPEND_OR_REPLACE: a request that arrives while a sync is
            // already running is QUEUED BEHIND it rather than dropped.
            //
            // This used to be KEEP, on the belief that a tap during a run
            // "joins" that run. It does not — KEEP discards the new request
            // outright, and the run it deferred to had already fetched its
            // delta window before the edit existed. So every edit made while a
            // sync happened to be in flight waited out the next 30-minute
            // periodic tick to reach the mirror, which is most of what made a
            // playlist edit feel like it never arrived.
            //
            // Not REPLACE, which actively CANCELLED the in-flight worker — and
            // since the engine's HTTP + SQLite calls are blocking (they don't
            // observe coroutine cancellation), the cancelled run's thread kept
            // going as a zombie alongside the replacement, interleaving two
            // writers on the sync-state row. Observed live on 2026-06-12
            // (WorkManager "was cancelled" followed by two overlapping run
            // summaries). APPEND_OR_REPLACE lets the running one finish, so
            // there is never a second writer.
            WorkManager.getInstance(reactContext).enqueueUniqueWork(
                ONE_SHOT_WORK_NAME,
                ExistingWorkPolicy.APPEND_OR_REPLACE,
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

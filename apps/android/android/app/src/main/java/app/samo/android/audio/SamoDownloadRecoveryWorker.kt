package app.samo.android.audio

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * Periodic sweep that puts broken downloads back in the queue.
 *
 * [SamoDownloadWorker] gives a single transfer three strikes and then stops,
 * which is the right call for one worker — unbounded backoff inside a job is
 * how this stack got its zombie downloads. But it leaves the entry parked as
 * Failed with nothing behind it except a Retry button on a screen the user has
 * no reason to visit, and the reasons transfers break are overwhelmingly
 * temporary: the server was asleep, the phone was on cellular with no
 * connection, samo-server restarted and every queued entry's stream token died
 * with it. Those entries are not downloads. They are rows that claim to be.
 *
 * So the retry surface lives out here instead, on the clock, where a widening
 * backoff is affordable. [SamoDownloadRecovery] decides which rows are
 * eligible and when; this worker just applies that verdict on a schedule and
 * hands the survivors back to WorkManager.
 *
 * It transfers nothing itself and holds no foreground notification: the
 * transfers it re-queues run in [SamoDownloadWorker] under the existing
 * [SamoDownloadService] anchor, so a sweep that finds nothing to do is
 * invisible and nearly free.
 */
internal class SamoDownloadRecoveryWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        return try {
            val result = withContext(Dispatchers.IO) {
                SamoDownloads.sweepRecoverable(applicationContext)
            }
            if (result.requeued > 0 || result.deferred > 0 || result.unrecoverable > 0) {
                Log.i(
                    TAG,
                    "download sweep: requeued=${result.requeued} waiting=${result.deferred} " +
                        "unrecoverable=${result.unrecoverable} heldBack=${result.heldBack}",
                )
            }
            Result.success()
        } catch (error: Throwable) {
            // Never Result.retry(): the next periodic firing IS the retry, and
            // an entry the sweep failed to re-queue keeps its state, so nothing
            // is lost by waiting for it. Backing off inside a job whose whole
            // job is backing off would only double the delay.
            Log.w(TAG, "download sweep failed", error)
            Result.success()
        }
    }

    companion object {
        private const val TAG = "SamoDownloadSweep"
        private const val PERIODIC_WORK_NAME = "samo-download-recovery-periodic"

        // Matches the catalog sync cadence so the two batch onto the same
        // wakeups. The real pacing is per-entry and lives in the recovery
        // backoff ladder; this only decides how often we look.
        private const val PERIODIC_INTERVAL_MINUTES = 30L
        private const val FLEX_MINUTES = 10L

        /**
         * Installs the sweep, or joins the one already installed.
         *
         * KEEP rather than UPDATE for the same reason the catalog sync uses it:
         * replacing a periodic request resets its interval timer, so an app
         * that is launched more often than every thirty minutes would push the
         * next run forever into the future and never sweep at all.
         */
        fun schedule(context: Context) {
            val appContext = context.applicationContext
            try {
                val request = PeriodicWorkRequestBuilder<SamoDownloadRecoveryWorker>(
                    PERIODIC_INTERVAL_MINUTES,
                    TimeUnit.MINUTES,
                    FLEX_MINUTES,
                    TimeUnit.MINUTES,
                )
                    .setConstraints(
                        Constraints.Builder()
                            // Re-queueing while offline would spend an entry's
                            // attempt on a transfer that cannot connect, and
                            // charge it a longer backoff for the privilege.
                            // Deferring here also means the sweep fires as soon
                            // as connectivity returns, which is when most of
                            // these entries became fixable in the first place.
                            .setRequiredNetworkType(NetworkType.CONNECTED)
                            .build(),
                    )
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
                    .build()
                WorkManager.getInstance(appContext).enqueueUniquePeriodicWork(
                    PERIODIC_WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request,
                )
            } catch (error: Throwable) {
                Log.w(TAG, "could not schedule download sweep", error)
            }
        }
    }
}

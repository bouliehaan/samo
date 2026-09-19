package app.samo.android.audio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.atomic.AtomicInteger

/**
 * Small foreground-service anchor for native offline downloads. The actual
 * transfer work lives in [SamoDownloadWorker]; this service keeps Android
 * from freezing or killing that work when the screen turns off or samo moves
 * to the background.
 *
 * Its one invariant: the notification exists exactly while a transfer is
 * live. Every transfer counts itself in with [begin] and out with [finish];
 * the service is asked for on the way in and stops itself, from its own
 * thread, once the count has sat at zero for [IDLE_STOP_DELAY_MS].
 *
 * The count is the only thing the service knows, so nothing may unbalance it.
 * The old shape did: [begin] counted first and then called
 * `startForegroundService()`, which Android 12+ refuses with an exception
 * while the app is in the background — precisely where the recovery sweep
 * and WorkManager's retries run — and the exception left the count one high
 * for the rest of the process. From then on no batch of downloads could ever
 * bring it back to zero, so the card outlived every transfer, sitting in the
 * shade with the OS clock counting up beside it.
 */
class SamoDownloadService : Service() {
    // When this instance came up. The card is re-posted on every begin() while
    // the service is alive; pinning `when` here keeps the shade's timestamp on
    // the moment downloading started rather than the most recent transfer.
    private var startedAt = 0L

    // The most recent start this instance was handed. A stop is only ever
    // issued against it — see stopIfIdle().
    private var lastStartId = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startedAt = System.currentTimeMillis()
        ensureNotificationChannel()
        instance = this
    }

    override fun onDestroy() {
        if (instance === this) {
            instance = null
        }
        // However this instance ends — idle, timed out, or torn down by the
        // system — the card leaves with it. The system cancels a foreground
        // notification when its service dies, but stating it here costs
        // nothing and does not depend on which path got us here.
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        lastStartId = startId
        // Every startForegroundService() must be answered with a
        // startForeground() — the system kills the app otherwise — so answer
        // before asking whether there is still anything to anchor. Re-posting
        // to a live service is a no-op for the user (same id, alert once).
        startForeground(NOTIFICATION_ID, buildNotification())
        stopIfIdle()
        // Not sticky. If the process dies mid-transfer, WorkManager brings the
        // transfer back and its begin() brings a fresh anchor with it. A sticky
        // restart would only re-post the stale card so onStartCommand could
        // remove it again.
        return START_NOT_STICKY
    }

    /**
     * Android 15 gives a `dataSync` service a daily budget and calls this when
     * it runs out; a service still standing a few seconds later takes the app
     * down with it. The transfers themselves are unaffected — they are
     * WorkManager's — they just run unanchored until the budget resets, and
     * [begin] will be refused for the same reason in the meantime.
     */
    override fun onTimeout(startId: Int, fgsType: Int) {
        Log.i(TAG, "download anchor timed out; transfers continue unanchored")
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    /**
     * Stops this instance if nothing is transferring. Main thread only.
     *
     * `stopSelf(startId)`, never the bare `stopSelf()`: if a begin() has asked
     * for a start this instance has not yet received, the system refuses this
     * stop and delivers that start instead. A bare stop would discard it — and
     * discarding a pending `startForegroundService()` is one of the ways the
     * "did not then call startForeground()" crash happens.
     */
    private fun stopIfIdle() {
        if (activeTransfers.get() > 0) {
            return
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf(lastStartId)
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID) != null) {
            return
        }
        manager.createNotificationChannel(
            NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Downloads",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Offline music download progress."
                setShowBadge(false)
            },
        )
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Downloading in samo")
            .setContentText("Saving music for offline listening")
            .setWhen(startedAt)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .build()
    }

    companion object {
        private const val TAG = "SamoDownloadService"
        private const val NOTIFICATION_CHANNEL_ID = "samo_downloads"
        private const val NOTIFICATION_ID = 1017

        // A queue hands over from one transfer to the next in milliseconds;
        // this keeps the anchor from being torn down and rebuilt in the gap.
        private const val IDLE_STOP_DELAY_MS = 15_000L
        private val IDLE_STOP_TOKEN = Any()

        private val activeTransfers = AtomicInteger(0)
        private val mainHandler = Handler(Looper.getMainLooper())

        // The live instance, if any. Set and cleared on the main thread; read
        // there too, by the idle stop.
        @Volatile
        private var instance: SamoDownloadService? = null

        /**
         * Counts one transfer in and asks for the anchor.
         *
         * Never throws, and must be paired with exactly one [finish]. The ask
         * can be refused — Android 12+ refuses a foreground start from the
         * background, Android 15 refuses one once the day's `dataSync` budget
         * is spent — and a refused ask changes nothing about the transfer,
         * which runs inside its WorkManager job on that job's own budget. It
         * just has no anchor. The count is still one higher, because the
         * transfer is still live; [finish] brings it back.
         *
         * Always asks, even when an instance is up. The instance may be on
         * its way down — a stop is in flight until onDestroy runs — and a
         * transfer that skipped the ask on seeing it would run unanchored
         * for its whole length. Asking is idempotent: a live service gets
         * one more onStartCommand and re-posts the same card.
         */
        fun begin(context: Context) {
            mainHandler.removeCallbacksAndMessages(IDLE_STOP_TOKEN)
            activeTransfers.incrementAndGet()
            val appContext = context.applicationContext
            try {
                ContextCompat.startForegroundService(
                    appContext,
                    Intent(appContext, SamoDownloadService::class.java),
                )
            } catch (error: Exception) {
                Log.i(TAG, "download anchor refused: ${error.message}")
            }
        }

        /**
         * Counts one transfer out. When it was the last, the anchor is told to
         * stand down after [IDLE_STOP_DELAY_MS] — on the main thread, from
         * inside the service, so it can check the count again first: a
         * transfer that began in the meantime keeps it up.
         */
        fun finish() {
            val remaining = activeTransfers.decrementAndGet()
            if (remaining > 0) {
                return
            }
            if (remaining < 0) {
                // A finish with no begin. Not a state this can reach on its
                // own; do not let a stray one hold the next batch's anchor up.
                activeTransfers.set(0)
            }
            mainHandler.removeCallbacksAndMessages(IDLE_STOP_TOKEN)
            mainHandler.postDelayed(
                { instance?.stopIfIdle() },
                IDLE_STOP_TOKEN,
                IDLE_STOP_DELAY_MS,
            )
        }
    }
}

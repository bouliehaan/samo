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
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Small foreground-service anchor for native offline downloads. The actual
 * transfer work lives in SamoFileSystemModule's IO executor; this service keeps
 * Android from freezing or killing that work when the screen turns off or Samo
 * moves to the background.
 */
class SamoDownloadService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        serviceRunning.set(true)
        ensureNotificationChannel()
    }

    override fun onDestroy() {
        serviceRunning.set(false)
        super.onDestroy()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        if (activeTransfers.get() <= 0) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
        return START_STICKY
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
            .setContentTitle("Downloading in Samo")
            .setContentText("Saving music for offline listening")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .build()
    }

    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "samo_downloads"
        private const val NOTIFICATION_ID = 1017
        private const val IDLE_STOP_DELAY_MS = 15_000L
        private val activeTransfers = AtomicInteger(0)
        private val serviceRunning = AtomicBoolean(false)
        private val mainHandler = Handler(Looper.getMainLooper())
        private var idleStop: Runnable? = null

        fun begin(context: Context) {
            idleStop?.let(mainHandler::removeCallbacks)
            idleStop = null
            activeTransfers.incrementAndGet()
            if (serviceRunning.get()) {
                return
            }
            ContextCompat.startForegroundService(
                context,
                Intent(context, SamoDownloadService::class.java),
            )
        }

        fun finish(context: Context) {
            if (activeTransfers.decrementAndGet() <= 0) {
                activeTransfers.set(0)
                val appContext = context.applicationContext
                val stop = Runnable {
                    idleStop = null
                    if (activeTransfers.get() <= 0) {
                        appContext.stopService(
                            Intent(appContext, SamoDownloadService::class.java),
                        )
                    }
                }
                idleStop = stop
                mainHandler.postDelayed(stop, IDLE_STOP_DELAY_MS)
            }
        }
    }
}

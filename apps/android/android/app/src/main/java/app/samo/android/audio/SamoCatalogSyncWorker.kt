package app.samo.android.audio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters

class SamoCatalogSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        val source = inputData.getString(KEY_TRIGGER_SOURCE) ?: "periodic"
        return try {
            val connections = SamoAuthMirror.loadSamo(applicationContext)
            val connection = connections.firstOrNull()
            if (connection == null) {
                Log.i(TAG, "catalog sync (source=$source) — no Samo connections, skipping")
                return Result.success()
            }
            val summary = SamoCatalogSync.runAll(applicationContext, connection)
            Log.i(
                TAG,
                "catalog sync (source=$source) ${summary.results.joinToString(" | ") {
                    "${it.sourceId} items=${it.items} tracks=${it.tracks} details=${it.details}" +
                        (if (it.errors.isNotEmpty()) " errors=${it.errors.joinToString("; ").take(300)}" else "")
                }}",
            )
            Result.success()
        } catch (error: Throwable) {
            // Don't retry: the periodic firing is the retry surface, and
            // unbounded backoff on a structural error just chews battery.
            Log.w(TAG, "catalog sync (source=$source) failed", error)
            Result.success()
        }
    }

    override suspend fun getForegroundInfo(): ForegroundInfo {
        return createForegroundInfo()
    }

    private fun createForegroundInfo(): ForegroundInfo {
        val channelId = "samo_catalog_sync"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Catalog Sync",
                NotificationManager.IMPORTANCE_LOW
            )
            val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setContentTitle("Samo Sync")
            .setContentText("Syncing library catalog...")
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setOngoing(true)
            .build()

        return ForegroundInfo(NOTIFICATION_ID, notification)
    }

    companion object {
        const val TAG = "SamoCatalogSyncWorker"
        const val KEY_TRIGGER_SOURCE = "trigger_source"
        const val NOTIFICATION_ID = 4001
    }
}

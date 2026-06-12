package app.samo.android.audio

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * Phase 5 PROPER: the periodic catalog sync runs entirely in Kotlin from this
 * worker. No JS context boot — the foreground service can't keep React alive
 * across Doze, so spinning up a React headless context every 30 min would
 * either fail outright or take seconds we don't have. Instead we read the
 * Kotlin-mirrored server connections + drive [SamoCatalogSync] directly
 * against the catalog DB.
 *
 * Per-source errors are caught and recorded in `catalog_sync_state` (so the
 * Settings panel can render them); the worker itself always returns success
 * because WorkManager's retry is the wrong primitive here — failures aren't
 * transient and we already have a 30-minute periodic re-fire.
 */
class SamoCatalogSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        val source = inputData.getString(KEY_TRIGGER_SOURCE) ?: "periodic"
        return try {
            val connections = SamoAuthMirror.loadSamo(applicationContext)
            if (connections.isEmpty()) {
                Log.i(TAG, "catalog sync (source=$source) — no Samo connections, skipping")
                return Result.success()
            }
            val summary = SamoCatalogSync.runAll(applicationContext, connections)
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

    companion object {
        const val TAG = "SamoCatalogSyncWorker"
        const val KEY_TRIGGER_SOURCE = "trigger_source"
    }
}

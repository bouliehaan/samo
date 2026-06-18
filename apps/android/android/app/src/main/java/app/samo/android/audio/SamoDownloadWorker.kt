package app.samo.android.audio

import android.content.Context
import android.net.Uri
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * One-shot worker that streams a single Samo download entry to disk. The
 * registry owner ([SamoDownloads]) schedules one of these per entry under a
 * unique work name so a process death restart resumes via WorkManager rather
 * than orphaning the entry as "downloading" forever — which was the JS
 * owner's failure mode (the in-flight handle died with the process and the
 * registry couldn't tell).
 *
 * The transfer logic itself mirrors the existing [SamoFileSystemModule]
 * implementation: 64 KB read buffer, on-the-fly progress reporting throttled
 * by [SamoDownloads.reportProgress], an optional bytes-per-second throttle
 * while audio playback is active, and a `.part` temp file that's atomically
 * renamed on success so a killed transfer never leaves a half-written file
 * pretending to be a complete one.
 */
internal class SamoDownloadWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val entryId = inputData.getString(KEY_ENTRY_ID) ?: return Result.failure()
        val preflight = SamoDownloads.findById(entryId) ?: return Result.success()

        // Already terminal — nothing to do. Happens when WorkManager retries
        // after the previous attempt completed/canceled/failed in a state
        // change the system didn't yet see.
        if (
            preflight.status == SamoDownloads.Status.Completed ||
            preflight.status == SamoDownloads.Status.Canceled
        ) {
            return Result.success()
        }

        // Concurrency gate. CoroutineWorkers don't occupy WorkManager's
        // executor threads, so without this every enqueued entry transfers
        // AT ONCE (a 1k-track playlist = 1k parallel streams). Waiters
        // suspend holding no thread, their entries still Queued; a cancel
        // while waiting propagates as a normal worker cancellation.
        SamoDownloads.transferSlots.acquire()
        try {
            // Re-read after the wait: deep queues sit here for a long time,
            // and the user may have canceled/removed/retried the entry since
            // the pre-flight read.
            val entry = SamoDownloads.findById(entryId) ?: return Result.success()
            if (
                entry.status == SamoDownloads.Status.Completed ||
                entry.status == SamoDownloads.Status.Canceled
            ) {
                return Result.success()
            }

            SamoDownloads.beginTransfer(applicationContext, entryId)
            SamoDownloadService.begin(applicationContext)
            return try {
                withContext(Dispatchers.IO) {
                    runTransfer(entry)
                }
            } catch (error: TransferCanceledException) {
                SamoDownloads.markCanceled(applicationContext, entryId)
                Result.success()
            } catch (error: TerminalDownloadException) {
                // HTTP 4xx (after the one-shot 401 token recovery): retrying the
                // same request can never succeed. Surface the failure and STOP —
                // the user's Retry button is the path forward. The old blanket
                // Result.retry() turned every stale-token batch into an invisible
                // forever-loop of zombie workers (the "downloads I never asked
                // for" + the 40s JS freezes their event storms caused).
                SamoDownloads.markFailed(applicationContext, entryId, error.message ?: "Download failed")
                Result.failure()
            } catch (error: CancellationException) {
                // WorkManager canceled the worker (entry cancel/remove/clear).
                // The cancel path already set the entry's terminal state —
                // rethrow so this records as canceled instead of the generic
                // handler stamping a user-canceled entry Failed.
                throw error
            } catch (error: Exception) {
                val message = error.message ?: "Download failed"
                SamoDownloads.markFailed(applicationContext, entryId, message)
                // Transient (connect/read/5xx) failures get exponential backoff,
                // but CAPPED: three strikes and the entry stays Failed until the
                // user retries. Unbounded backoff retries were zombie downloads.
                if (runAttemptCount >= 2) Result.failure() else Result.retry()
            } finally {
                SamoDownloadService.finish(applicationContext)
            }
        } finally {
            SamoDownloads.transferSlots.release()
        }
    }

    private suspend fun runTransfer(entry: SamoDownloads.Entry): Result {
        val destination = SamoDownloads.localFileForEntry(applicationContext, entry)
        val partial = File(destination.absolutePath + ".part")
        if (partial.exists()) partial.delete()
        destination.parentFile?.mkdirs()

        var connection: HttpURLConnection? = null
        try {
            connection = openWithFreshToken(entry, forceFresh = false)
            var responseCode = connection.responseCode
            if (responseCode == 401 || responseCode == 403) {
                // The minted-at-enqueue token expired while the entry sat in
                // the queue. Force a fresh mint and retry ONCE — the same
                // recovery the player's data source performs.
                connection.disconnect()
                connection = openWithFreshToken(entry, forceFresh = true)
                responseCode = connection.responseCode
            }
            if (responseCode in 400..499) {
                throw TerminalDownloadException("HTTP $responseCode")
            }
            if (responseCode !in 200..299) {
                throw IllegalStateException("HTTP $responseCode")
            }

            val totalBytes = connection.contentLengthLong.takeIf { it > 0 } ?: -1L
            var writtenBytes = 0L
            val startedAt = System.currentTimeMillis()
            val buffer = ByteArray(64 * 1024)

            connection.inputStream.use { input ->
                FileOutputStream(partial).use { output ->
                    while (true) {
                        if (!currentCoroutineContext().isActive) {
                            throw TransferCanceledException()
                        }
                        val read = input.read(buffer)
                        if (read <= 0) break
                        output.write(buffer, 0, read)
                        writtenBytes += read.toLong()

                        SamoDownloads.reportProgress(
                            applicationContext,
                            entry.id,
                            writtenBytes,
                            if (totalBytes > 0) totalBytes else null,
                        )

                        val throttle = SamoDownloads.currentThrottleBytesPerSecond()
                        if (throttle > 0) {
                            val expectedElapsedMs = writtenBytes * 1000L / throttle
                            val actualElapsedMs = System.currentTimeMillis() - startedAt
                            val sleepMs = expectedElapsedMs - actualElapsedMs
                            if (sleepMs > 0) {
                                Thread.sleep(kotlin.math.min(sleepMs, 250L))
                            }
                        }
                    }
                    output.flush()
                }
            }

            if (destination.exists()) destination.delete()
            if (!partial.renameTo(destination)) {
                throw IllegalStateException("Could not move completed download into place")
            }

            val localUri = Uri.fromFile(destination).toString()
            SamoDownloads.markCompleted(
                applicationContext,
                entry.id,
                localUri,
                writtenBytes,
                totalBytes,
            )
            return Result.success()
        } finally {
            connection?.disconnect()
            if (partial.exists()) {
                partial.delete()
            }
        }
    }

    /** Re-resolve the entry URL with a live stream token (when the entry
     *  carries its auth context), then open the connection. */
    private fun openWithFreshToken(entry: SamoDownloads.Entry, forceFresh: Boolean): HttpURLConnection {
        var url = entry.sourceUrl
        var serverUrl = entry.serverUrl
        var bearer = entry.serverBearer
        if (serverUrl.isNullOrBlank() || bearer.isNullOrBlank()) {
            // Entries enqueued before auth context rode along (or whose JS
            // caller had none): recover it from the auth mirror by host
            // match — the same fallback the player's resolving data source
            // uses. Without this, retrying a legacy entry replays its stale
            // minted-at-enqueue token straight into another 401.
            val connection = SamoAuthMirror.loadSamo(applicationContext)
                .firstOrNull { entry.sourceUrl.startsWith(it.url) }
            if (connection != null) {
                serverUrl = connection.url
                bearer = connection.credential
            }
        }
        if (!serverUrl.isNullOrBlank() && !bearer.isNullOrBlank()) {
            if (SamoNativeStreamUrl.ensureFreshTokenBlocking(serverUrl, bearer, forceFresh)) {
                SamoNativeStreamUrl.freshenUrlTokenFromCache(url, serverUrl, bearer)?.let { url = it }
            }
        }
        return (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 30_000
            requestMethod = "GET"
        }
    }

    private class TransferCanceledException : RuntimeException("canceled")

    private class TerminalDownloadException(message: String) : RuntimeException(message)

    companion object {
        const val KEY_ENTRY_ID = "entryId"
    }
}

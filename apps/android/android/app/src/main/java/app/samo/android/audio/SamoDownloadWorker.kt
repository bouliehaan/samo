package app.samo.android.audio

import android.content.Context
import android.net.Uri
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
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
        val entry = SamoDownloads.findById(entryId) ?: return Result.success()

        // Already terminal — nothing to do. Happens when WorkManager retries
        // after the previous attempt completed/canceled/failed in a state
        // change the system didn't yet see.
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
        } catch (error: Exception) {
            val message = error.message ?: "Download failed"
            SamoDownloads.markFailed(applicationContext, entryId, message)
            // Returning failure tells WorkManager to retry with the exponential
            // backoff configured by [SamoDownloads.scheduleWork] until the user
            // gives up and cancels. Genuinely unrecoverable failures (404s on
            // a track that was deleted server-side) still surface a Failed
            // entry to the user via [markFailed]; the retry-loop just isn't
            // observable in the UI because the row is already red.
            Result.retry()
        } finally {
            SamoDownloadService.finish(applicationContext)
        }
    }

    private suspend fun runTransfer(entry: SamoDownloads.Entry): Result {
        val destination = SamoDownloads.localFileForEntry(applicationContext, entry)
        val partial = File(destination.absolutePath + ".part")
        if (partial.exists()) partial.delete()
        destination.parentFile?.mkdirs()

        var connection: HttpURLConnection? = null
        try {
            connection = (URL(entry.sourceUrl).openConnection() as HttpURLConnection).apply {
                connectTimeout = 15_000
                readTimeout = 30_000
                requestMethod = "GET"
            }
            val responseCode = connection.responseCode
            if (responseCode !in 200..299) {
                // Treat 4xx as terminal — retrying a 404 is not going to help,
                // and surfaces the error to the user. Any non-2xx surfaces as
                // a failure for the same reason; the user can retry from the
                // UI once they fix the upstream issue.
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

    private class TransferCanceledException : RuntimeException("canceled")

    companion object {
        const val KEY_ENTRY_ID = "entryId"
    }
}

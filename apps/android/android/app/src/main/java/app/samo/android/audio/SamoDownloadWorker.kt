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
 * The transfer is RESUMABLE, and has to be: every worker runs inside a
 * JobScheduler job, and JobScheduler stops a job after roughly ten minutes no
 * matter what it is doing. The `SamoDownloadService` foreground anchor keeps
 * the process alive across that, but it cannot extend the job's execution
 * budget. A long audiobook simply does not fit in one window — at the
 * playback throttle (512 KB/s) ten minutes buys about 300 MB — so a transfer
 * that cannot pick up where it left off can never finish, however many times
 * it retries. Each attempt therefore keeps its `.part` file and asks for the
 * tail with a `Range` header; only a completed, canceled, or removed entry
 * clears the partial.
 *
 * Otherwise it mirrors the existing [SamoFileSystemModule] implementation:
 * 64 KB read buffer, on-the-fly progress reporting throttled by
 * [SamoDownloads.reportProgress], an optional bytes-per-second throttle while
 * audio playback is active, and a `.part` temp file that's atomically renamed
 * on success so a killed transfer never leaves a half-written file pretending
 * to be a complete one.
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

            // Send with the session the device holds NOW for this entry's
            // server, never the token it was queued with: disconnect and sign
            // in again, and that token was revoked on the way out. Signed out
            // of the server, there is nothing to send with, so the entry waits
            // for a sign-in rather than failing, and keeps its bytes.
            val session = SamoSessionCredentials.resolve(applicationContext, entry.credentialClaim)
                as? SamoSessionCredentials.Resolution.Usable
            if (session == null) {
                SamoDownloads.markWaitingForSignIn(applicationContext, entryId, rejectedCredential = null)
                return Result.success()
            }

            SamoDownloads.beginTransfer(applicationContext, entryId)
            return try {
                // Inside the try, so the finish() below is unconditional. The
                // anchor's count is its whole idea of whether anything is
                // happening, and a begin() that escaped without its finish()
                // is how the download card came to outlive every download.
                SamoDownloadService.begin(applicationContext)
                withContext(Dispatchers.IO) {
                    runTransfer(entry, session)
                }
            } catch (error: SessionRejectedException) {
                // The server refused the token the device holds for it. Nothing
                // will work until the user signs in again, so wait for that
                // instead of spending the entry's retries and landing in Failed.
                SamoDownloads.markWaitingForSignIn(
                    applicationContext,
                    entryId,
                    rejectedCredential = session.credential,
                )
                Result.success()
            } catch (error: TransferCanceledException) {
                SamoDownloads.markCanceled(applicationContext, entryId)
                Result.success()
            } catch (error: TransferInterruptedException) {
                // NOT a user action: the system stopped us mid-transfer, or the
                // response body ended early. This used to land in the cancel
                // branch above, which retired the entry and deleted its bytes —
                // so a book too big for one execution window died at the same
                // place every single attempt.
                //
                // Hand the entry back to the queue with its byte count intact
                // and leave the `.part` file alone. WorkManager reschedules an
                // interrupted worker by itself (no backoff, no attempt
                // increment), and the next pass resumes from the recorded
                // offset rather than starting the book over.
                SamoDownloads.markInterrupted(
                    applicationContext,
                    entryId,
                    error.bytesWritten,
                    error.totalBytes,
                )
                Result.retry()
            } catch (error: TerminalDownloadException) {
                // HTTP 4xx (after the one-shot 401 token recovery): retrying the
                // same request can never succeed, so this worker stops here. The
                // old blanket Result.retry() turned every stale-token batch into
                // an invisible forever-loop of zombie workers (the "downloads I
                // never asked for" + the 40s JS freezes their event storms).
                //
                // Terminal to THIS worker is not the same as terminal forever,
                // though, and the flag says which. A 401 that survived a token
                // refresh means samo-server restarted and dropped the in-process
                // token this entry was minted against — it comes right the moment
                // the server is back, so the recovery sweep may chase it later.
                // A 404 it may not, and that entry waits for the Retry button.
                SamoDownloads.markFailed(
                    applicationContext,
                    entryId,
                    error.message ?: "Download failed",
                    recoverable = error.recoverable,
                )
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
                // but CAPPED: three strikes and this worker gives up, because
                // unbounded backoff inside a job is what zombie downloads are
                // made of. Retrying on a horizon long enough to be worth it is
                // the recovery sweep's job, and markFailed defaults to letting
                // it — a dropped connection is the definition of worth retrying.
                // The partial survives either way, so the next attempt — swept
                // or by hand — resumes instead of refetching what we hold.
                if (runAttemptCount >= 2) Result.failure() else Result.retry()
            } finally {
                SamoDownloadService.finish()
            }
        } finally {
            SamoDownloads.transferSlots.release()
        }
    }

    private suspend fun runTransfer(
        entry: SamoDownloads.Entry,
        session: SamoSessionCredentials.Resolution.Usable,
    ): Result {
        val destination = SamoDownloads.localFileForEntry(applicationContext, entry)
        val partial = File(destination.absolutePath + ".part")
        destination.parentFile?.mkdirs()

        // Bytes an earlier attempt already banked. Nothing here re-fetches them.
        val startFrom = if (partial.exists()) partial.length() else 0L
        val knownTotal = entry.totalBytes?.takeIf { it > 0 }

        // The partial already holds the whole file: an earlier attempt finished
        // the transfer and was stopped in the sliver between the last byte and
        // the rename. Publish it instead of paying for the book twice — asking
        // for `bytes=<size>-` would earn a 416 and a full restart.
        if (knownTotal != null && startFrom == knownTotal) {
            return finalize(entry, partial, destination, knownTotal, knownTotal)
        }

        var connection: HttpURLConnection? = null
        try {
            val stream = openStream(entry, session, startFrom, partial)
            connection = stream.connection
            val totalBytes = stream.totalBytes
            var writtenBytes = stream.resumeFrom
            var bytesThisAttempt = 0L
            val startedAt = System.currentTimeMillis()
            val buffer = ByteArray(64 * 1024)

            connection.inputStream.use { input ->
                FileOutputStream(partial, /* append = */ stream.resumeFrom > 0).use { output ->
                    while (true) {
                        if (!currentCoroutineContext().isActive) {
                            // Stopped. What happens to the bytes on disk depends
                            // entirely on WHY, so get them durable before asking.
                            output.flush()
                            handleStop(entry.id, writtenBytes, totalBytes)
                        }
                        val read = input.read(buffer)
                        if (read <= 0) break
                        output.write(buffer, 0, read)
                        writtenBytes += read.toLong()
                        bytesThisAttempt += read.toLong()

                        SamoDownloads.reportProgress(
                            applicationContext,
                            entry.id,
                            writtenBytes,
                            if (totalBytes > 0) totalBytes else null,
                        )

                        val throttle = SamoDownloads.currentThrottleBytesPerSecond()
                        if (throttle > 0) {
                            // Paced against THIS attempt's bytes and clock. Pacing
                            // the running total would bill a resumed transfer for
                            // time it never spent and park it at the 250ms cap on
                            // every single chunk.
                            val expectedElapsedMs = bytesThisAttempt * 1000L / throttle
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

            if (totalBytes > 0 && writtenBytes < totalBytes) {
                // The body ended early — a dropped connection that surfaced as a
                // clean EOF rather than an exception. Renaming this into place
                // would publish a truncated book as a complete one, which is
                // worse than not having it.
                if (bytesThisAttempt <= 0L) {
                    // Moved nothing at all: a broken response, not an
                    // interruption. Take the strike-capped failure path so a
                    // server that keeps hanging up can't spin here forever.
                    throw IllegalStateException(
                        "Download ended early at $writtenBytes of $totalBytes bytes",
                    )
                }
                // Made progress, so keep the partial and resume from it.
                throw TransferInterruptedException(writtenBytes, totalBytes)
            }

            return finalize(entry, partial, destination, writtenBytes, totalBytes)
        } finally {
            connection?.disconnect()
        }
    }

    /** Atomically publishes a fully-transferred `.part` file as the download. */
    private fun finalize(
        entry: SamoDownloads.Entry,
        partial: File,
        destination: File,
        writtenBytes: Long,
        totalBytes: Long,
    ): Result {
        if (destination.exists()) destination.delete()
        if (!partial.renameTo(destination)) {
            throw IllegalStateException("Could not move completed download into place")
        }
        SamoDownloads.markCompleted(
            applicationContext,
            entry.id,
            Uri.fromFile(destination).toString(),
            writtenBytes,
            totalBytes,
        )
        return Result.success()
    }

    /**
     * Opens the transfer stream, settling every response that invalidates our
     * resume point BEFORE a byte is written. The rules live in
     * [SamoDownloadResume]; this just performs them. Each restart reason fires
     * at most once, so the loop is bounded.
     */
    private fun openStream(
        entry: SamoDownloads.Entry,
        session: SamoSessionCredentials.Resolution.Usable,
        startFrom: Long,
        partial: File,
    ): OpenStream {
        var resumeFrom = startFrom
        var forceFreshToken = false
        var restarted = startFrom <= 0L
        while (true) {
            val connection = openWithFreshToken(entry, session, forceFreshToken, resumeFrom)
            val decision = try {
                SamoDownloadResume.decide(
                    responseCode = connection.responseCode,
                    resumeFrom = resumeFrom,
                    contentLength = connection.contentLengthLong,
                    contentRangeTotal = SamoDownloadResume.parseContentRangeTotal(
                        connection.getHeaderField("Content-Range"),
                    ),
                    knownTotal = entry.totalBytes,
                    canRefreshToken = !forceFreshToken,
                    canRestart = !restarted,
                )
            } catch (error: Exception) {
                connection.disconnect()
                throw error
            }

            when (decision) {
                is SamoDownloadResume.Decision.RefreshToken -> {
                    connection.disconnect()
                    forceFreshToken = true
                }
                is SamoDownloadResume.Decision.RestartFromZero -> {
                    connection.disconnect()
                    partial.delete()
                    resumeFrom = 0L
                    restarted = true
                }
                is SamoDownloadResume.Decision.Terminal -> {
                    connection.disconnect()
                    throw TerminalDownloadException(decision.message, decision.recoverable)
                }
                is SamoDownloadResume.Decision.Transient -> {
                    connection.disconnect()
                    throw IllegalStateException(decision.message)
                }
                is SamoDownloadResume.Decision.Proceed -> {
                    // Proceeding from zero while we hold bytes means the server
                    // ignored the Range and is sending the whole body; those
                    // bytes cannot be spliced onto ours.
                    if (resumeFrom > 0 && decision.resumeFrom == 0L) {
                        partial.delete()
                    }
                    return OpenStream(connection, decision.resumeFrom, decision.totalBytes)
                }
            }
        }
    }

    /** Open the entry's URL on [session]'s address with a live stream token
     *  minted from [session]. */
    private fun openWithFreshToken(
        entry: SamoDownloads.Entry,
        session: SamoSessionCredentials.Resolution.Usable,
        forceFresh: Boolean,
        resumeFrom: Long,
    ): HttpURLConnection {
        // A queued download can easily outlive the network it was queued on:
        // the server moved, or we left the LAN and now reach it through its
        // remote address. Retrying against a dead origin just burns the retry
        // budget, so the URL follows the session to wherever it is now.
        var url = SamoNativeStreamUrl.rehomeUrl(entry.sourceUrl, session.serverUrl) ?: entry.sourceUrl
        when (
            SamoNativeStreamUrl.ensureFreshTokenBlocking(session.serverUrl, session.credential, forceFresh)
        ) {
            null ->
                SamoNativeStreamUrl.freshenUrlTokenFromCache(url, session.serverUrl, session.credential)
                    ?.let { url = it }
            SamoNativeStreamUrl.MintFailureReason.Auth -> throw SessionRejectedException()
            // Unreachable or erroring: try the URL as it stands. Its own token
            // may still be good, and a request that fails for real lands in
            // the usual failure handling.
            else -> Unit
        }
        return (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 30_000
            requestMethod = "GET"
            if (resumeFrom > 0) {
                // Ask for the tail only. samo-server serves media through Go's
                // http.ServeContent, which answers this with a 206 and a
                // Content-Range; anything that can't answers 200 and the caller
                // above throws the partial away.
                setRequestProperty("Range", "bytes=$resumeFrom-")
            }
        }
    }

    /**
     * Records the outcome of a stop and then unwinds the transfer.
     *
     * The registry write happens HERE, before a single frame unwinds, rather
     * than in `doWork`'s catch blocks. We are on a cancelled coroutine, and a
     * cancelled `withContext` is free to discard the exception its body threw
     * and surface its own `CancellationException` instead — which would route
     * a system stop into the generic cancellation branch and lose the resume
     * point. Writing first makes the registry correct no matter which
     * exception survives the trip out; the catch blocks then only pick the
     * `Result`, and [SamoDownloads.markInterrupted] ignores a second call
     * because the row is no longer `Downloading`.
     */
    private fun handleStop(entryId: String, writtenBytes: Long, totalBytes: Long): Nothing {
        if (isUserTerminated(entryId)) {
            SamoDownloads.markCanceled(applicationContext, entryId)
            throw TransferCanceledException()
        }
        SamoDownloads.markInterrupted(
            applicationContext,
            entryId,
            writtenBytes,
            totalBytes.takeIf { it > 0 },
        )
        throw TransferInterruptedException(writtenBytes, totalBytes.takeIf { it > 0 })
    }

    /**
     * A stopped worker is either the user's doing — cancel/remove, both of
     * which stamp the registry row BEFORE they cancel the work — or the
     * system's: the execution cap, a lost network constraint, Doze. Only the
     * first is terminal; the second has to keep its bytes.
     */
    private fun isUserTerminated(entryId: String): Boolean {
        if (SamoDownloads.isUserRetired(entryId)) return true
        val current = SamoDownloads.findById(entryId) ?: return true
        return current.status == SamoDownloads.Status.Canceled
    }

    private class OpenStream(
        val connection: HttpURLConnection,
        val resumeFrom: Long,
        val totalBytes: Long,
    )

    private class TransferCanceledException : RuntimeException("canceled")

    /** The server refused the token the device holds for it. */
    private class SessionRejectedException : RuntimeException("session rejected")

    private class TransferInterruptedException(
        val bytesWritten: Long,
        val totalBytes: Long?,
    ) : RuntimeException("interrupted")

    private class TerminalDownloadException(
        message: String,
        val recoverable: Boolean,
    ) : RuntimeException(message)

    companion object {
        const val KEY_ENTRY_ID = "entryId"
    }
}

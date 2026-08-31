package app.samo.android.audio

/**
 * The rules for picking up an interrupted download where it stopped, as pure
 * logic so they can be tested without a network, a worker, or a device.
 *
 * Resuming is not optional for Samo: every download runs inside a WorkManager
 * job, and JobScheduler stops a job after roughly ten minutes whatever it is
 * doing. A long audiobook does not fit in one window, so a transfer that
 * restarts from byte zero after each stop dies at the same place forever. The
 * subtlety is that not every response to a `Range` request means "carry on" —
 * several mean "the bytes you are holding are worthless", and mistaking one for
 * the other splices two different reads into a file of exactly the right length
 * that will not play.
 */
internal object SamoDownloadResume {
    sealed interface Decision {
        /** Stream the body, appending to the partial from [resumeFrom]. */
        data class Proceed(val resumeFrom: Long, val totalBytes: Long) : Decision

        /** Mint a fresh stream token and re-request. */
        object RefreshToken : Decision

        /** Throw the partial away and re-request the whole resource. */
        object RestartFromZero : Decision

        /**
         * Retrying this request in the same worker can never succeed.
         *
         * [recoverable] is a longer-horizon question with a different answer:
         * a 401 that outlived a token refresh will still be a 401 a second
         * later, but stops being one the moment samo-server is back up minting
         * fresh tokens — so the recovery sweep may chase that one, and may not
         * chase a 404.
         */
        data class Terminal(val message: String, val recoverable: Boolean = false) : Decision

        /** This attempt is lost, but a later one may work. */
        data class Transient(val message: String) : Decision
    }

    private const val HTTP_PARTIAL = 206
    private const val HTTP_RANGE_NOT_SATISFIABLE = 416

    /**
     * @param resumeFrom bytes already on disk that this request asked to skip.
     * @param contentLength the response's own length, or <= 0 when unknown.
     * @param contentRangeTotal resource size parsed out of `Content-Range`.
     * @param knownTotal resource size an earlier attempt recorded, if any.
     * @param canRefreshToken false once a fresh token has already been tried.
     * @param canRestart false once we have already restarted from zero, so a
     *   server that answers every request badly can't loop us.
     */
    fun decide(
        responseCode: Int,
        resumeFrom: Long,
        contentLength: Long,
        contentRangeTotal: Long?,
        knownTotal: Long?,
        canRefreshToken: Boolean,
        canRestart: Boolean,
    ): Decision {
        // The minted-at-enqueue token expired while the entry sat in the queue.
        if ((responseCode == 401 || responseCode == 403) && canRefreshToken) {
            return Decision.RefreshToken
        }
        // "Range not satisfiable": the partial reaches to or past the end of the
        // resource — a re-encoded file, or a `.part` left by a larger earlier
        // version. There is nothing here to salvage.
        if (responseCode == HTTP_RANGE_NOT_SATISFIABLE && canRestart) {
            return Decision.RestartFromZero
        }
        if (responseCode in 400..499) {
            return Decision.Terminal(
                "HTTP $responseCode",
                recoverable = SamoDownloadRecovery.isRecoverableStatus(responseCode),
            )
        }
        if (responseCode !in 200..299) {
            return Decision.Transient("HTTP $responseCode")
        }

        if (responseCode == HTTP_PARTIAL && resumeFrom > 0) {
            val total = contentRangeTotal
                ?: (resumeFrom + contentLength).takeIf { contentLength > 0 }
                ?: -1L
            // A different size means a different file. Appending its tail to our
            // bytes would produce the right byte count and an unplayable book.
            if (knownTotal != null && knownTotal > 0 && total > 0 && total != knownTotal && canRestart) {
                return Decision.RestartFromZero
            }
            return Decision.Proceed(resumeFrom, total)
        }

        // A plain 200 answering a Range request means the server ignored it and
        // is sending the whole body from byte zero, so the partial has to go.
        return Decision.Proceed(0L, if (contentLength > 0) contentLength else -1L)
    }

    /** Pulls the resource size out of `Content-Range: bytes 12-99/100`. */
    fun parseContentRangeTotal(header: String?): Long? {
        if (header == null) return null
        val total = header.substringAfterLast('/', "").trim()
        if (total.isEmpty() || total == "*") return null
        return total.toLongOrNull()?.takeIf { it > 0 }
    }
}

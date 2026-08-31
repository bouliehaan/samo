package app.samo.android.audio

/**
 * The rules for deciding, on its own and long after the fact, that a broken
 * download is worth trying again — as pure logic so they can be tested without
 * a network, a worker, or a device.
 *
 * A download breaks for reasons that mostly heal themselves: the server was
 * asleep, the phone left Wi-Fi, samo-server restarted and dropped the
 * in-process stream tokens every queued entry was minted against. None of
 * those are the user's fault and none of them are permanent, yet the registry
 * used to park the entry as Failed (or, before the resume work, as Canceled)
 * and wait for someone to open the Downloads screen and press a button. An
 * entry nobody ever presses that button for is dead weight: it occupies a row,
 * claims a track is downloaded when it isn't, and never becomes offline audio.
 *
 * So a sweep heals them instead. The two things it must not do are the two
 * failure modes this download stack has already been burned by:
 *
 *   1. Resurrecting a download the user deliberately cancelled — the
 *      "downloads I never asked for" complaint. Hence [canceledByUser]: only
 *      the user's own cancel sets it, so only rows the user did not retire are
 *      ever eligible.
 *   2. Hammering something that can never work. A 404 is not going to become
 *      a 200 because we asked eleven more times, so a failure the transfer
 *      classified unrecoverable is left alone with its Retry button; and every
 *      eligible entry waits out a widening backoff before each attempt, so a
 *      server that has been gone for a week costs one request a day, not one
 *      request every half hour forever.
 */
internal object SamoDownloadRecovery {
    sealed interface Decision {
        /** Put it back in the queue now. */
        object Requeue : Decision

        /** Eligible, but still serving its backoff. */
        data class Wait(val remainingMillis: Long) : Decision

        /** Healthy, in flight, or retired by the user. Not ours to touch. */
        object Settled : Decision

        /** Broken in a way no automatic retry can fix; the Retry button remains. */
        object Unrecoverable : Decision
    }

    /**
     * How long an entry waits before its next automatic attempt, widening with
     * each one the sweep has already spent.
     *
     * The first step is deliberately not zero: by the time an entry reaches
     * Failed the worker has already burned its own three strikes on a 30s
     * exponential backoff, so an immediate fourth try would just be the third
     * one again. The ladder then walks out to a day, which is the cadence that
     * matters for the case this exists for — a home server that is off until
     * someone turns it back on.
     */
    private val BACKOFF_LADDER_MILLIS = longArrayOf(
        5L * 60_000L,
        30L * 60_000L,
        2L * 60L * 60_000L,
        8L * 60L * 60_000L,
    )
    private const val BACKOFF_CEILING_MILLIS = 24L * 60L * 60_000L

    fun backoffMillis(recoveryAttempts: Int): Long =
        if (recoveryAttempts < 0) {
            BACKOFF_LADDER_MILLIS.first()
        } else {
            BACKOFF_LADDER_MILLIS.getOrElse(recoveryAttempts) { BACKOFF_CEILING_MILLIS }
        }

    /**
     * @param canceledByUser true only when the user's own cancel retired this
     *   row. Absent from registries written before the sweep existed, which
     *   reads as false — the one-time heal of the cancelled entries that
     *   accumulated back when a system stop was recorded as a cancellation.
     * @param failureRecoverable what the transfer concluded about the failure:
     *   false for the HTTP answers that can only ever repeat themselves.
     * @param recoveryAttempts automatic attempts already spent on this entry,
     *   reset whenever it completes or the user retries it by hand.
     * @param lastFailureAt when it entered its broken state, or null on a row
     *   that predates the stamp.
     */
    fun decide(
        status: SamoDownloads.Status,
        canceledByUser: Boolean,
        failureRecoverable: Boolean,
        recoveryAttempts: Int,
        lastFailureAt: Long?,
        now: Long,
    ): Decision {
        when (status) {
            SamoDownloads.Status.Failed ->
                if (!failureRecoverable) return Decision.Unrecoverable
            // A cancellation carries no failure classification — the paths that
            // produced one never ran. Whose cancellation it was is the whole
            // question.
            SamoDownloads.Status.Canceled ->
                if (canceledByUser) return Decision.Settled
            else -> return Decision.Settled
        }

        // Never stamped: a row from before the sweep existed. It has waited
        // long enough by definition.
        val failedAt = lastFailureAt ?: return Decision.Requeue
        // The stamp is in the future — the clock moved backwards under us (an
        // NTP correction, a timezone the user flew into). Waiting for a future
        // to arrive that the device has already left would park the entry for
        // however far the jump was, so treat it as due.
        if (failedAt > now) return Decision.Requeue

        val waitFor = backoffMillis(recoveryAttempts)
        val waited = now - failedAt
        return if (waited < waitFor) Decision.Wait(waitFor - waited) else Decision.Requeue
    }

    /**
     * Whether a transfer that ended in this HTTP status can ever succeed by
     * being asked again.
     *
     * 401 and 403 look permanent and are anything but: samo-server keeps
     * stream tokens in process memory, so every queued entry's token dies the
     * moment the server restarts, and the whole batch 401s at once. That is
     * precisely the case the sweep exists to clean up. 408 and 429 say so on
     * the tin. Everything else in the 4xx range is the server telling us the
     * resource is not there and will not be.
     */
    fun isRecoverableStatus(responseCode: Int): Boolean =
        responseCode == 401 || responseCode == 403 || responseCode == 408 || responseCode == 429
}

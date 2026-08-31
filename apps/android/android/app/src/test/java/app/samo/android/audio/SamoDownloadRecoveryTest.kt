package app.samo.android.audio

import app.samo.android.audio.SamoDownloadRecovery.Decision
import app.samo.android.audio.SamoDownloads.Status
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the rules that decide when a broken download gets another go on its
 * own.
 *
 * The value is obvious — a failed download that nobody re-taps is not a
 * download, it is a row claiming to be one — but the two ways to get this
 * wrong are both worse than the problem. Resurrect a cancellation the user
 * meant and you are downloading things they told you not to; chase a failure
 * that can never succeed and you are back to the zombie workers this stack
 * spent a release killing. Every case below is one of those.
 */
class SamoDownloadRecoveryTest {
    private val now = 1_700_000_000_000L

    private fun decide(
        status: Status = Status.Failed,
        canceledByUser: Boolean = false,
        failureRecoverable: Boolean = true,
        recoveryAttempts: Int = 0,
        lastFailureAt: Long? = null,
        at: Long = now,
    ): Decision = SamoDownloadRecovery.decide(
        status = status,
        canceledByUser = canceledByUser,
        failureRecoverable = failureRecoverable,
        recoveryAttempts = recoveryAttempts,
        lastFailureAt = lastFailureAt,
        now = at,
    )

    private val fiveMinutes = 5L * 60_000L
    private val oneDay = 24L * 60L * 60_000L

    @Test
    fun `a failure that has served its backoff goes back in the queue`() {
        assertEquals(
            Decision.Requeue,
            decide(lastFailureAt = now - fiveMinutes),
        )
    }

    @Test
    fun `a fresh failure waits`() {
        // The worker has only just spent its own three strikes on this entry.
        // An immediate fourth try is the third one again.
        val decision = decide(lastFailureAt = now - 60_000L)
        assertTrue(decision is Decision.Wait)
        assertEquals(fiveMinutes - 60_000L, (decision as Decision.Wait).remainingMillis)
    }

    @Test
    fun `a cancellation the user asked for is never resurrected`() {
        assertEquals(
            Decision.Settled,
            decide(
                status = Status.Canceled,
                canceledByUser = true,
                lastFailureAt = now - oneDay,
            ),
        )
    }

    @Test
    fun `a cancellation nobody asked for is healed`() {
        // Rows stranded by the build where a system stop — the ten-minute
        // execution cap, a lost network — was recorded as a cancellation.
        // Nothing ever retried these, and nothing ever would.
        assertEquals(
            Decision.Requeue,
            decide(status = Status.Canceled, canceledByUser = false),
        )
    }

    @Test
    fun `a failure that can never succeed is left alone`() {
        // A 404 does not become a 200 by being asked eleven more times.
        assertEquals(
            Decision.Unrecoverable,
            decide(failureRecoverable = false, lastFailureAt = now - oneDay),
        )
    }

    @Test
    fun `entries that are not broken are not touched`() {
        for (status in listOf(Status.Queued, Status.Downloading, Status.Completed)) {
            assertEquals(Decision.Settled, decide(status = status))
        }
    }

    @Test
    fun `a row with no failure stamp is due immediately`() {
        // Written by a build that predates the stamp. It has, by definition,
        // been waiting longer than any backoff we could ask of it.
        assertEquals(Decision.Requeue, decide(lastFailureAt = null))
    }

    @Test
    fun `the backoff widens with each attempt and stops at a day`() {
        val ladder = (0..8).map { SamoDownloadRecovery.backoffMillis(it) }
        // Strictly increasing until it flattens: each retry of something that
        // keeps failing has to cost less than the last.
        for (i in 1 until ladder.size) {
            assertTrue("step $i shrank", ladder[i] >= ladder[i - 1])
        }
        assertEquals(fiveMinutes, ladder.first())
        assertEquals(oneDay, ladder.last())
        // A server that has been off for a week costs one request a day, not
        // one every half hour forever.
        assertEquals(oneDay, SamoDownloadRecovery.backoffMillis(99))
    }

    @Test
    fun `a later attempt waits longer than an earlier one`() {
        assertTrue(decide(recoveryAttempts = 3, lastFailureAt = now - fiveMinutes) is Decision.Wait)
        assertEquals(
            Decision.Requeue,
            decide(recoveryAttempts = 3, lastFailureAt = now - oneDay),
        )
    }

    @Test
    fun `a clock that jumped backwards does not park an entry in the future`() {
        // An NTP correction or a flight across timezones leaves a stamp ahead
        // of now; waiting for it to arrive would strand the entry for however
        // far the jump was.
        assertEquals(Decision.Requeue, decide(lastFailureAt = now + oneDay))
    }

    @Test
    fun `only the statuses that can heal themselves are chased`() {
        // samo-server keeps stream tokens in process memory, so a restart 401s
        // every queued entry at once — the single biggest source of the failed
        // downloads this sweep exists to clear.
        assertTrue(SamoDownloadRecovery.isRecoverableStatus(401))
        assertTrue(SamoDownloadRecovery.isRecoverableStatus(403))
        assertTrue(SamoDownloadRecovery.isRecoverableStatus(408))
        assertTrue(SamoDownloadRecovery.isRecoverableStatus(429))
        // The server saying the resource is not there, and will not be.
        assertFalse(SamoDownloadRecovery.isRecoverableStatus(404))
        assertFalse(SamoDownloadRecovery.isRecoverableStatus(410))
        assertFalse(SamoDownloadRecovery.isRecoverableStatus(400))
    }
}

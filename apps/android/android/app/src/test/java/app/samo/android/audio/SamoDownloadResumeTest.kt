package app.samo.android.audio

import app.samo.android.audio.SamoDownloadResume.Decision
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the rules that let a download survive being stopped.
 *
 * Every download runs inside a WorkManager job, and JobScheduler stops a job
 * after roughly ten minutes regardless of what it is doing — so a large
 * audiobook is always stopped mid-transfer, and a worker that restarts from
 * byte zero dies at the same place on every attempt, forever. Resuming is what
 * makes the download finishable at all.
 *
 * The risk resuming introduces is the opposite one: appending a response that
 * ISN'T the tail of what we already hold produces a file of exactly the
 * expected length that will not play. Every case below is one server answer
 * that must NOT be treated as "carry on".
 */
class SamoDownloadResumeTest {
    private fun decide(
        code: Int,
        resumeFrom: Long = 0L,
        contentLength: Long = -1L,
        contentRangeTotal: Long? = null,
        knownTotal: Long? = null,
        canRefreshToken: Boolean = true,
        canRestart: Boolean = true,
    ): Decision = SamoDownloadResume.decide(
        responseCode = code,
        resumeFrom = resumeFrom,
        contentLength = contentLength,
        contentRangeTotal = contentRangeTotal,
        knownTotal = knownTotal,
        canRefreshToken = canRefreshToken,
        canRestart = canRestart,
    )

    @Test
    fun `206 resumes from the bytes already on disk`() {
        val decision = decide(
            code = 206,
            resumeFrom = 300_000_000L,
            contentLength = 200_000_000L,
            contentRangeTotal = 500_000_000L,
            knownTotal = 500_000_000L,
        )
        // The whole point: attempt two asks for the tail and keeps the 300MB
        // attempt one banked before the execution cap cut it off.
        assertEquals(Decision.Proceed(300_000_000L, 500_000_000L), decision)
    }

    @Test
    fun `206 without Content-Range infers the total from the tail length`() {
        assertEquals(
            Decision.Proceed(100L, 250L),
            decide(code = 206, resumeFrom = 100L, contentLength = 150L),
        )
    }

    @Test
    fun `206 with neither Content-Range nor length proceeds with unknown total`() {
        // Unknown total is survivable — progress shows indeterminate and the
        // truncation check is skipped — so it must not abort the transfer.
        assertEquals(
            Decision.Proceed(100L, -1L),
            decide(code = 206, resumeFrom = 100L, contentLength = -1L),
        )
    }

    @Test
    fun `200 answering a range request restarts from zero`() {
        // The server ignored Range and is sending the whole body. Appending it
        // to our partial would duplicate the head of the file.
        assertEquals(
            Decision.Proceed(0L, 500L),
            decide(code = 200, resumeFrom = 300L, contentLength = 500L),
        )
    }

    @Test
    fun `206 for a resource that changed size discards the partial`() {
        // Re-encoded on the server. Its tail spliced onto our head is the
        // failure mode worth guarding: right byte count, unplayable file.
        assertEquals(
            Decision.RestartFromZero,
            decide(
                code = 206,
                resumeFrom = 300L,
                contentRangeTotal = 900L,
                knownTotal = 500L,
            ),
        )
    }

    @Test
    fun `206 for a matching size is not mistaken for a changed resource`() {
        assertEquals(
            Decision.Proceed(300L, 500L),
            decide(
                code = 206,
                resumeFrom = 300L,
                contentRangeTotal = 500L,
                knownTotal = 500L,
            ),
        )
    }

    @Test
    fun `size mismatch proceeds rather than looping once a restart is spent`() {
        // canRestart=false means we already threw the partial away once. Doing
        // it again would loop forever against a server that always disagrees.
        assertTrue(
            decide(
                code = 206,
                resumeFrom = 300L,
                contentRangeTotal = 900L,
                knownTotal = 500L,
                canRestart = false,
            ) is Decision.Proceed,
        )
    }

    @Test
    fun `416 discards a partial that outruns the resource`() {
        assertEquals(
            Decision.RestartFromZero,
            decide(code = 416, resumeFrom = 900L, knownTotal = 500L),
        )
    }

    @Test
    fun `416 with no restart left is terminal rather than a retry loop`() {
        assertTrue(
            decide(code = 416, resumeFrom = 900L, canRestart = false) is Decision.Terminal,
        )
    }

    @Test
    fun `401 mints a fresh token once`() {
        assertEquals(Decision.RefreshToken, decide(code = 401))
        assertEquals(Decision.RefreshToken, decide(code = 403))
    }

    @Test
    fun `401 after a fresh token is terminal, not an endless retry`() {
        // The old worker retried every failure forever; a batch queued against
        // a dead credential became invisible zombie workers.
        assertTrue(decide(code = 401, canRefreshToken = false) is Decision.Terminal)
    }

    @Test
    fun `4xx is terminal and 5xx is transient`() {
        assertTrue(decide(code = 404) is Decision.Terminal)
        assertTrue(decide(code = 410) is Decision.Terminal)
        assertTrue(decide(code = 500) is Decision.Transient)
        assertTrue(decide(code = 503) is Decision.Transient)
    }

    @Test
    fun `terminal answers say whether they can ever come right`() {
        // Terminal to this transfer is not terminal forever, and the recovery
        // sweep needs the difference: a stale-token 401 heals the moment
        // samo-server is back, a 404 never does.
        assertEquals(
            Decision.Terminal("HTTP 401", recoverable = true),
            decide(code = 401, canRefreshToken = false),
        )
        assertEquals(
            Decision.Terminal("HTTP 404", recoverable = false),
            decide(code = 404),
        )
    }

    @Test
    fun `parses the resource size out of Content-Range`() {
        assertEquals(100L, SamoDownloadResume.parseContentRangeTotal("bytes 12-99/100"))
        assertEquals(500L, SamoDownloadResume.parseContentRangeTotal(" bytes 0-499/500 "))
    }

    @Test
    fun `treats an unusable Content-Range as unknown`() {
        assertNull(SamoDownloadResume.parseContentRangeTotal(null))
        assertNull(SamoDownloadResume.parseContentRangeTotal("bytes 12-99/*"))
        assertNull(SamoDownloadResume.parseContentRangeTotal("bytes 12-99/nonsense"))
        assertNull(SamoDownloadResume.parseContentRangeTotal("bytes 0-0/0"))
    }
}

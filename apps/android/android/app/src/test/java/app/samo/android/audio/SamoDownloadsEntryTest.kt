package app.samo.android.audio

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the two things a queued download needs to survive a disconnect and a
 * sign-in: it names its server by the key the rest of the app files it under
 * (not by the token it was queued with), and a download parked for want of a
 * session stays parked across a restart instead of being pumped straight
 * back into a worker that can only park it again.
 */
class SamoDownloadsEntryTest {
    private fun entry(waitingForSignIn: Boolean = false) = SamoDownloads.Entry(
        id = "dl-1",
        trackId = "t1",
        title = "Track",
        sourceUrl = "http://192.168.1.20:8991/api/v1/music/tracks/t1/stream?stream_token=old",
        collection = SamoDownloads.Collection(
            id = "album-1",
            sourceId = "samo:srv-1",
            title = "Album",
            type = "album",
        ),
        status = SamoDownloads.Status.Queued,
        enqueuedAt = 1L,
        serverUrl = "http://192.168.1.20:8991",
        serverBearer = "revoked",
        waitingForSignIn = waitingForSignIn,
    )

    @Test
    fun `a download names its server by connection key`() {
        val claim = entry().credentialClaim
        assertEquals("samo:srv-1", claim.connectionKey)
        assertEquals("http://192.168.1.20:8991", claim.serverUrl)
        assertEquals("revoked", claim.credential)
        assertEquals(entry().sourceUrl, claim.resourceUrl)
    }

    @Test
    fun `a parked download stays parked across a restart`() {
        val restored = SamoDownloads.Entry.fromJson(JSONObject(entry(waitingForSignIn = true).toJson().toString()))
        assertTrue(restored.waitingForSignIn)
    }

    @Test
    fun `rows written before parking existed are not parked`() {
        val json = entry().toJson()
        assertFalse(json.has("waitingForSignIn"))
        assertFalse(SamoDownloads.Entry.fromJson(json).waitingForSignIn)
    }
}

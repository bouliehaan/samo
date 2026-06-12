package app.samo.android.audio

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/**
 * Locks the native stream-token cache semantics that keep the playback hot
 * path off the network: serve-until-near-expiry, the 5-minute refresh lead,
 * the 25-minute fallback TTL, per-(server, bearer) keying, and invalidation.
 * These mirror the JS cache in server-samo-stream-token.ts — if either side
 * drifts, track starts either hammer the mint endpoint again or hand ExoPlayer
 * tokens that 401 seconds later.
 */
class SamoStreamTokenCacheTest {
    private var clockMs = 1_000_000L

    @Before
    fun setUp() {
        SamoStreamTokenCache.clear()
        SamoStreamTokenCache.now = { clockMs }
    }

    @After
    fun tearDown() {
        SamoStreamTokenCache.clear()
        SamoStreamTokenCache.now = { System.currentTimeMillis() }
    }

    @Test
    fun `returns cached token before expiry lead`() {
        SamoStreamTokenCache.put("https://samo", "bearer-1", "tok-a", clockMs + 30 * 60_000L)
        assertEquals("tok-a", SamoStreamTokenCache.get("https://samo", "bearer-1"))
    }

    @Test
    fun `refuses token within five minutes of expiry`() {
        SamoStreamTokenCache.put("https://samo", "bearer-1", "tok-a", clockMs + 30 * 60_000L)
        clockMs += 26 * 60_000L // 4 minutes before expiry — inside the lead window
        assertNull(SamoStreamTokenCache.get("https://samo", "bearer-1"))
    }

    @Test
    fun `serves token just outside the lead window`() {
        SamoStreamTokenCache.put("https://samo", "bearer-1", "tok-a", clockMs + 30 * 60_000L)
        clockMs += 24 * 60_000L // 6 minutes before expiry — still fresh enough
        assertEquals("tok-a", SamoStreamTokenCache.get("https://samo", "bearer-1"))
    }

    @Test
    fun `null expiry falls back to 25 minute ttl`() {
        SamoStreamTokenCache.put("https://samo", "bearer-1", "tok-a", null)
        clockMs += 19 * 60_000L // 25 - 19 = 6 min left, outside the 5-min lead
        assertEquals("tok-a", SamoStreamTokenCache.get("https://samo", "bearer-1"))
        clockMs += 2 * 60_000L // now only 4 min left — inside the lead
        assertNull(SamoStreamTokenCache.get("https://samo", "bearer-1"))
    }

    @Test
    fun `bearer change misses the cache`() {
        SamoStreamTokenCache.put("https://samo", "bearer-1", "tok-a", clockMs + 30 * 60_000L)
        assertNull(SamoStreamTokenCache.get("https://samo", "bearer-2"))
    }

    @Test
    fun `server url change misses the cache`() {
        SamoStreamTokenCache.put("https://samo-a", "bearer-1", "tok-a", clockMs + 30 * 60_000L)
        assertNull(SamoStreamTokenCache.get("https://samo-b", "bearer-1"))
    }

    @Test
    fun `invalidate removes only the matching entry`() {
        SamoStreamTokenCache.put("https://samo-a", "bearer-1", "tok-a", clockMs + 30 * 60_000L)
        SamoStreamTokenCache.put("https://samo-b", "bearer-1", "tok-b", clockMs + 30 * 60_000L)
        SamoStreamTokenCache.invalidate("https://samo-a", "bearer-1")
        assertNull(SamoStreamTokenCache.get("https://samo-a", "bearer-1"))
        assertEquals("tok-b", SamoStreamTokenCache.get("https://samo-b", "bearer-1"))
    }

    @Test
    fun `parses rfc3339 expiry with zulu suffix`() {
        val parsed = SamoStreamTokenCache.parseExpiresAtMs("2026-06-11T20:14:05Z")
        assertEquals(1781208845000L, parsed)
    }

    @Test
    fun `parses rfc3339 expiry with offset and nanos`() {
        val parsed = SamoStreamTokenCache.parseExpiresAtMs("2026-06-11T20:14:05.123456789+00:00")
        assertEquals(1781208845123L, parsed)
    }

    @Test
    fun `unparseable expiry returns null`() {
        assertNull(SamoStreamTokenCache.parseExpiresAtMs(null))
        assertNull(SamoStreamTokenCache.parseExpiresAtMs(""))
        assertNull(SamoStreamTokenCache.parseExpiresAtMs("not-a-date"))
    }
}

package app.samo.android.audio

/**
 * Process-wide cache for minted Samo stream tokens, keyed by (serverUrl, bearer).
 *
 * Mirrors the JS-side cache in `packages/core/src/server/server-samo-stream-token.ts`:
 * tokens live ~30 minutes server-side; we stop serving a cached token 5 minutes
 * before its expiry so a URL built from it never 401s seconds after being handed
 * to ExoPlayer. When the server response carries no parseable `expiresAt`, a
 * conservative 25-minute fallback TTL applies.
 *
 * Why this exists: before the cache, EVERY track start minted at least twice
 * (once in play()'s queue-item refresh, once when SamoResolvingDataSource opened
 * the source) — two serialized HTTP roundtrips per song on the play-start hot
 * path, and a mint-endpoint hammering pattern under fast Next-skipping. With the
 * cache, steady-state playback mints once per ~25 minutes per server.
 *
 * The 401-recovery path must NOT trust this cache (the cached token may be the
 * one that just got rejected): callers pass forceFresh=true there, which also
 * invalidates the stale entry for everyone else.
 */
internal object SamoStreamTokenCache {
    private const val REFRESH_LEAD_TIME_MS = 5L * 60L * 1000L
    private const val DEFAULT_FALLBACK_TTL_MS = 25L * 60L * 1000L

    internal data class Entry(val token: String, val expiresAtMs: Long)

    private val entries = HashMap<String, Entry>()
    private val lock = Any()

    /** Test seam; production uses the wall clock. */
    internal var now: () -> Long = { System.currentTimeMillis() }

    private fun key(serverUrl: String, bearer: String) = "$serverUrl|$bearer"

    fun get(serverUrl: String, bearer: String): String? {
        synchronized(lock) {
            val cacheKey = key(serverUrl, bearer)
            val entry = entries[cacheKey] ?: return null
            if (entry.expiresAtMs - REFRESH_LEAD_TIME_MS <= now()) {
                entries.remove(cacheKey)
                return null
            }
            return entry.token
        }
    }

    fun put(serverUrl: String, bearer: String, token: String, expiresAtMs: Long?) {
        synchronized(lock) {
            entries[key(serverUrl, bearer)] = Entry(
                token = token,
                expiresAtMs = expiresAtMs ?: (now() + DEFAULT_FALLBACK_TTL_MS),
            )
        }
    }

    fun invalidate(serverUrl: String, bearer: String) {
        synchronized(lock) {
            entries.remove(key(serverUrl, bearer))
        }
    }

    fun clear() {
        synchronized(lock) {
            entries.clear()
        }
    }

    /**
     * Parse the server's `expiresAt` (RFC3339, e.g. `2026-06-11T20:14:05Z` or
     * with an offset) to epoch ms. Returns null on any parse failure so the
     * caller falls back to the conservative TTL.
     */
    fun parseExpiresAtMs(raw: String?): Long? {
        if (raw.isNullOrBlank()) return null
        return try {
            java.time.Instant.parse(raw).toEpochMilli()
        } catch (_: Exception) {
            try {
                java.time.OffsetDateTime.parse(raw).toInstant().toEpochMilli()
            } catch (_: Exception) {
                null
            }
        }
    }
}

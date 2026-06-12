// Pure cover-art URL identity — split out from services/artwork-cache.ts (which
// pulls in native FileSystem) so the canonicalization logic stays unit-testable.

// Query params that rotate per-request (auth) but do NOT identify a different
// image. Samo embeds a `stream_token` that the server rotates ~every 25 min; if
// it stayed in the cache key, every cover would peek-miss after each rotation
// and be re-downloaded/re-decoded — the exact source of the periodic art flash.
export const VOLATILE_ARTWORK_PARAMS = ['stream_token'];

/**
 * Stable identity for a remote cover URL: the same image collapses to ONE key
 * across stream-token rotations (and query-param reordering). Used as the
 * managed-cache filename seed AND the expo-image `cacheKey`, so token churn
 * never re-downloads, re-decodes, or flashes art. `file://`, `data:`, and
 * unparseable inputs pass through unchanged.
 */
export const canonicalArtworkKey = (url: string): string => {
    if (!url || url.startsWith('file://') || url.startsWith('data:')) {
        return url;
    }
    try {
        const parsed = new URL(url);
        for (const param of VOLATILE_ARTWORK_PARAMS) {
            parsed.searchParams.delete(param);
        }
        // Normalize remaining param order so equivalent URLs share one key.
        parsed.searchParams.sort();
        return parsed.toString();
    } catch {
        return url;
    }
};

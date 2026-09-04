// Pure cover-art URL identity — split out from services/artwork-cache.ts (which
// pulls in native FileSystem) so the canonicalization logic stays unit-testable.

// Query params that rotate per-request (auth) but do NOT identify a different
// image. samo embeds a `stream_token` that the server rotates ~every 25 min; if
// it stayed in the cache key, every cover would peek-miss after each rotation
// and be re-downloaded/re-decoded — the exact source of the periodic art flash.
export const VOLATILE_ARTWORK_PARAMS = ['stream_token'];

// Memo of raw URL -> canonical key. `new URL()` is a JS polyfill under Hermes
// (whatwg-url) and costs ~0.1ms a parse; a two-up browse grid resolves this per
// tile (once for the cacheKey, once for the disk-cache peek) for every cover
// that scrolls past, so on a fast fling the parses pile onto the JS thread and
// starve FlashList of the cells it needs to render ahead. The mapping is a pure
// function of the URL, and covers recur constantly as tiles recycle, so caching
// it collapses all repeat work to a Map hit. Bounded so a large library with
// rotating stream tokens (each a distinct raw URL) can't grow it without limit.
const CANONICAL_KEY_CACHE_LIMIT = 4096;
const canonicalKeyCache = new Map<string, string>();

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
    const cached = canonicalKeyCache.get(url);
    if (cached !== undefined) {
        return cached;
    }
    let key: string;
    try {
        const parsed = new URL(url);
        for (const param of VOLATILE_ARTWORK_PARAMS) {
            parsed.searchParams.delete(param);
        }
        // Normalize remaining param order so equivalent URLs share one key.
        parsed.searchParams.sort();
        key = parsed.toString();
    } catch {
        key = url;
    }
    if (canonicalKeyCache.size >= CANONICAL_KEY_CACHE_LIMIT) {
        canonicalKeyCache.clear();
    }
    canonicalKeyCache.set(url, key);
    return key;
};

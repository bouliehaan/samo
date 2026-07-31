import { type MobileMediaDetail } from '@samo/core/mobile';

import {
    MEDIA_DETAIL_MEMORY_BYTE_LIMIT,
    MEDIA_DETAIL_MEMORY_CACHE_LIMIT,
    MEDIA_DETAIL_MEMORY_TRACK_LIMIT,
} from './app-constants';

/**
 * LRU for hydrated media details, bounded by BYTES first and entry count
 * second.
 *
 * Counting entries alone was the wrong bound: a detail's size is set by what
 * the server put in it, not by how many of them we hold. On a real catalog the
 * biggest podcast detail was 7.9MB of JSON while an artist detail was 13KB —
 * a 600× spread that a 24-slot cache treated as identical. Twenty-four of the
 * large ones is hundreds of MB of Hermes heap, and the JS heap climbing is what
 * turns a fast session into a slow one.
 *
 * The stored payloads are much leaner since the sync projects them
 * (SamoCatalogSync.slimDetailBundle), but the bound belongs here regardless:
 * this cache holds whatever a detail happens to weigh, including details that
 * came straight off the network and never passed through the projection.
 */

interface CacheAccounting {
    /** Estimated heap bytes per cache key, mirroring the cache's own keys. */
    sizes: Map<string, number>;
    total: number;
}

// Keyed by the cache Map itself so callers keep passing their own instance and
// the accounting can never outlive it.
const accounting = new WeakMap<Map<string, MobileMediaDetail>, CacheAccounting>();

const accountingFor = (cache: Map<string, MobileMediaDetail>): CacheAccounting => {
    const existing = accounting.get(cache);
    if (existing) {
        return existing;
    }
    const created: CacheAccounting = { sizes: new Map(), total: 0 };
    accounting.set(cache, created);
    return created;
};

/** Rough per-detail overhead (title/artwork/ids) before track data. */
const DETAIL_BASE_BYTES = 512;
/**
 * JSON length → heap bytes. Hermes strings are UTF-16 (2 bytes/char) and every
 * object/array carries header + slot overhead on top; 4× the serialized length
 * is a deliberately conservative stand-in. The exact multiplier does not matter
 * much — it only has to be stable, so the budget means the same thing entry to
 * entry.
 */
const HEAP_BYTES_PER_JSON_CHAR = 4;

/**
 * Estimated heap cost of a detail.
 *
 * Sizing by sampling ONE track rather than serializing the whole detail: tracks
 * within a detail share a shape, so a single measurement extrapolates, and this
 * runs on every cache write — walking a 1,155-track playlist to size it would
 * cost more than the cache saves.
 */
const estimateDetailBytes = (detail: MobileMediaDetail): number => {
    const trackCount = detail.tracks.length;
    if (trackCount === 0) {
        return DETAIL_BASE_BYTES;
    }
    let sampleChars = 0;
    try {
        sampleChars = JSON.stringify(detail.tracks[0] ?? {}).length;
    } catch {
        // A cyclic or otherwise unserializable track: fall back to a figure
        // that is large enough not to under-count it into the cache for free.
        sampleChars = 2_048;
    }
    return DETAIL_BASE_BYTES + sampleChars * trackCount * HEAP_BYTES_PER_JSON_CHAR;
};

const forget = (
    cache: Map<string, MobileMediaDetail>,
    books: CacheAccounting,
    key: string,
): void => {
    const bytes = books.sizes.get(key);
    if (bytes !== undefined) {
        books.total -= bytes;
        books.sizes.delete(key);
    }
    cache.delete(key);
};

export const rememberMediaDetail = (
    cache: Map<string, MobileMediaDetail>,
    key: string,
    detail: MobileMediaDetail,
) => {
    const books = accountingFor(cache);

    if (detail.tracks.length > MEDIA_DETAIL_MEMORY_TRACK_LIMIT) {
        forget(cache, books, key);
        return;
    }

    const bytes = estimateDetailBytes(detail);
    // A single detail bigger than the whole budget is not cacheable — admitting
    // it would evict everything else and then still not fit.
    if (bytes > MEDIA_DETAIL_MEMORY_BYTE_LIMIT) {
        forget(cache, books, key);
        return;
    }

    // Re-insert so the key moves to the most-recent end of the iteration order.
    forget(cache, books, key);
    cache.set(key, detail);
    books.sizes.set(key, bytes);
    books.total += bytes;

    while (
        cache.size > MEDIA_DETAIL_MEMORY_CACHE_LIMIT ||
        books.total > MEDIA_DETAIL_MEMORY_BYTE_LIMIT
    ) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey === undefined || oldestKey === key) break;
        forget(cache, books, oldestKey);
    }
};

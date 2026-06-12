import * as FileSystem from 'expo-file-system/legacy';

import { canonicalArtworkKey } from '../utils/artwork-canonical';

/**
 * Managed on-disk cover-art cache that WE own, so the user's size limit is real
 * and enforceable (expo-image's built-in disk cache exposes neither a size nor a
 * cap). Artwork is downloaded once into a dedicated directory keyed by a hash of
 * the CANONICAL (token-stripped) remote URL — so a cover stays a cache hit even
 * after its stream token rotates; a small persisted index tracks per-file bytes
 * + last access so we can report the total size and LRU-evict down to the cap.
 *
 * ArtworkImage feeds expo-image the returned `file://` uri with cachePolicy
 * "memory" — this directory is the single source of truth for on-disk art.
 */

const ARTWORK_DIR = `${FileSystem.documentDirectory ?? ''}samo-artwork/`;
const INDEX_FILE = `${ARTWORK_DIR}index.json`;
const PERSIST_DEBOUNCE_MS = 12_000;
const PRUNE_DEBOUNCE_MS = 6_000;
// Bump when the on-disk filename scheme changes. v2 hashes the CANONICAL
// (token-stripped) URL; v1 filenames were hashed from token-bearing URLs and so
// can never match a v2 lookup — they're dropped once on first load (see
// loadIndex) and the bulk prefetch re-warms under stable keys.
const INDEX_VERSION = 2;

export const DEFAULT_ARTWORK_CACHE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

interface ArtworkEntry {
    bytes: number;
    lastAccess: number;
    url?: string;
}

interface PersistedIndex {
    entries: Record<string, ArtworkEntry>;
    version: number;
}

type ArtworkIndex = Map<string, ArtworkEntry>;

let indexPromise: Promise<ArtworkIndex> | null = null;
// Synchronous handle to the loaded index so display code can resolve a cache
// hit during render (no async flicker for already-cached art).
let loadedIndex: ArtworkIndex | null = null;
let limitBytes = DEFAULT_ARTWORK_CACHE_LIMIT_BYTES;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pruneTimer: ReturnType<typeof setTimeout> | null = null;
const inFlightDownloads = new Map<string, Promise<string | null>>();

/** Stable, collision-resistant filename for a URL (two independent hashes). */
const hashUrl = (url: string): string => {
    let h1 = 5381;
    let h2 = 52711;
    for (let i = 0; i < url.length; i += 1) {
        const code = url.charCodeAt(i);
        h1 = (Math.imul(h1, 33) ^ code) >>> 0;
        h2 = (Math.imul(h2, 31) + code) >>> 0;
    }
    return `${h1.toString(36)}${h2.toString(36)}`;
};

const ensureDir = async (): Promise<void> => {
    const info = await FileSystem.getInfoAsync(ARTWORK_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(ARTWORK_DIR, { intermediates: true });
    }
};

const isCurrentPersistedIndex = (value: unknown): value is PersistedIndex => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as Partial<PersistedIndex>;
    return (
        candidate.version === INDEX_VERSION &&
        typeof candidate.entries === 'object' &&
        candidate.entries !== null
    );
};

const loadIndex = async (): Promise<ArtworkIndex> => {
    await ensureDir();
    const index: ArtworkIndex = new Map();
    try {
        const raw = await FileSystem.readAsStringAsync(INDEX_FILE);
        const parsed = JSON.parse(raw) as unknown;
        if (isCurrentPersistedIndex(parsed)) {
            for (const [name, entry] of Object.entries(parsed.entries)) {
                if (entry && typeof entry.bytes === 'number') {
                    index.set(name, {
                        bytes: entry.bytes,
                        lastAccess: typeof entry.lastAccess === 'number' ? entry.lastAccess : 0,
                        url: entry.url,
                    });
                }
            }
        } else {
            // Legacy (or future) cache scheme: the on-disk filenames can't match
            // our canonical lookups, so they'd peek-miss forever and waste disk.
            // Drop the directory once and write a fresh version marker; the bulk
            // prefetch re-warms everything under stable keys on the next sync.
            await FileSystem.deleteAsync(ARTWORK_DIR, { idempotent: true }).catch(
                () => undefined,
            );
            await ensureDir();
            await FileSystem.writeAsStringAsync(
                INDEX_FILE,
                JSON.stringify({ entries: {}, version: INDEX_VERSION }),
            ).catch(() => undefined);
        }
    } catch {
        // No persisted index yet (or unreadable) — start empty.
    }
    loadedIndex = index;
    return index;
};

const getIndex = (): Promise<ArtworkIndex> => {
    if (!indexPromise) {
        indexPromise = loadIndex();
    }
    return indexPromise;
};

/** Warms the in-memory index so {@link peekArtworkLocalUri} can hit synchronously. */
export const warmArtworkCache = (): void => {
    void getIndex();
};

/**
 * Synchronous cache lookup for render paths: returns the local `file://` uri if
 * the art is known to be cached, else null (download via getArtworkLocalUri).
 * Assumes the file exists for a tracked entry; display code falls back to the
 * remote URL if the local file turns out to be missing.
 */
export const peekArtworkLocalUri = (remoteUrl: string): string | null => {
    if (!remoteUrl || remoteUrl.startsWith('file://')) {
        return remoteUrl || null;
    }
    if (!loadedIndex) {
        return null;
    }
    const name = hashUrl(canonicalArtworkKey(remoteUrl));
    return loadedIndex.has(name) ? `${ARTWORK_DIR}${name}` : null;
};

const persistIndex = async (): Promise<void> => {
    try {
        const index = await getIndex();
        const entries: Record<string, ArtworkEntry> = {};
        for (const [name, entry] of index) {
            entries[name] = entry;
        }
        await FileSystem.writeAsStringAsync(
            INDEX_FILE,
            JSON.stringify({ entries, version: INDEX_VERSION }),
        );
    } catch {
        // Best-effort; the index rebuilds from disk if lost.
    }
};

const schedulePersist = (): void => {
    if (persistTimer) {
        return;
    }
    persistTimer = setTimeout(() => {
        persistTimer = null;
        void persistIndex();
    }, PERSIST_DEBOUNCE_MS);
};

const totalBytes = (index: ArtworkIndex): number => {
    let total = 0;
    for (const entry of index.values()) {
        total += entry.bytes;
    }
    return total;
};

/** Evicts least-recently-used art until the cache fits under the current cap. */
export const pruneArtworkCacheToLimit = async (): Promise<void> => {
    const index = await getIndex();
    let total = totalBytes(index);
    if (total <= limitBytes) {
        return;
    }
    const entries = [...index.entries()].sort(
        (left, right) => left[1].lastAccess - right[1].lastAccess,
    );
    for (const [name, entry] of entries) {
        if (total <= limitBytes) {
            break;
        }
        try {
            await FileSystem.deleteAsync(`${ARTWORK_DIR}${name}`, { idempotent: true });
        } catch {
            // ignore — still drop it from the index so accounting stays honest
        }
        index.delete(name);
        total -= entry.bytes;
    }
    schedulePersist();
};

// Debounced prune. A bulk warm fires thousands of downloads; pruning (which sums
// + sorts the whole index) on EACH one was O(n²) on the JS thread and tanked
// frame rate. Coalesce to one prune after the burst settles.
const schedulePrune = (): void => {
    if (pruneTimer) {
        return;
    }
    pruneTimer = setTimeout(() => {
        pruneTimer = null;
        void pruneArtworkCacheToLimit();
    }, PRUNE_DEBOUNCE_MS);
};

const downloadArtwork = async (
    name: string,
    fileUri: string,
    remoteUrl: string,
    headers: Record<string, string> | undefined,
): Promise<string | null> => {
    try {
        await ensureDir();
        const result = await FileSystem.downloadAsync(
            remoteUrl,
            fileUri,
            headers ? { headers } : undefined,
        );
        if (result.status >= 400) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);
            return null;
        }
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
            return null;
        }
        const index = await getIndex();
        index.set(name, {
            bytes: info.size,
            lastAccess: Date.now(),
            url: canonicalArtworkKey(remoteUrl),
        });
        schedulePersist();
        schedulePrune();
        return fileUri;
    } catch {
        return null;
    }
};

/**
 * Resolves a remote artwork URL to a local `file://` uri, downloading + caching
 * it on first request. Returns null on failure so the caller can fall back to the
 * remote URL. Concurrent requests for the same URL share a single download.
 */
export const getArtworkLocalUri = async (
    remoteUrl: string,
    headers?: Record<string, string>,
): Promise<string | null> => {
    if (!remoteUrl || remoteUrl.startsWith('file://')) {
        return remoteUrl || null;
    }
    // Filename is keyed by the CANONICAL (token-stripped) URL so the file is a
    // hit across token rotations; the fetch below still uses the full URL.
    const name = hashUrl(canonicalArtworkKey(remoteUrl));
    const fileUri = `${ARTWORK_DIR}${name}`;

    const index = await getIndex();
    const existing = index.get(name);
    if (existing) {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
            existing.lastAccess = Date.now();
            schedulePersist();
            return fileUri;
        }
        index.delete(name);
    }

    const pending = inFlightDownloads.get(name);
    if (pending) {
        return pending;
    }
    const download = downloadArtwork(name, fileUri, remoteUrl, headers).finally(() => {
        inFlightDownloads.delete(name);
    });
    inFlightDownloads.set(name, download);
    return download;
};

/** Total bytes currently held in the managed cover-art cache. */
export const getArtworkCacheSizeBytes = async (): Promise<number> => {
    const index = await getIndex();
    return totalBytes(index);
};

export interface ArtworkPrefetchEntry {
    headers?: Record<string, string>;
    uri: string;
}

const BULK_PREFETCH_CONCURRENCY = 4;
const BULK_PREFETCH_CAP_CHECK_EVERY = 25;

/**
 * Proactively downloads a batch of cover-art URLs into the cache with bounded
 * concurrency, stopping once the cache reaches its size cap. De-duplicates by
 * URL. Used after a sync to warm the WHOLE library's art so browsing never
 * triggers a per-tile fetch. Already-cached entries are skipped cheaply.
 */
export const prefetchArtworkUrls = async (
    entries: ArtworkPrefetchEntry[],
    options?: { isCancelled?: () => boolean },
): Promise<void> => {
    const seen = new Set<string>();
    const queue = entries.filter((entry) => {
        if (!entry.uri || entry.uri.startsWith('file://')) {
            return false;
        }
        // De-dup by canonical key so the same cover requested with different
        // stream tokens collapses to one download.
        const key = canonicalArtworkKey(entry.uri);
        if (
            seen.has(key) ||
            // Already cached — skip via the sync peek so a warm-cache launch does
            // NOT do a native `getInfoAsync` stat for every one of thousands of
            // covers. Only genuine misses fall through to a download.
            peekArtworkLocalUri(entry.uri)
        ) {
            return false;
        }
        seen.add(key);
        return true;
    });

    let cursor = 0;
    let processed = 0;
    let stopped = false;

    const worker = async (): Promise<void> => {
        while (cursor < queue.length && !stopped) {
            if (options?.isCancelled?.()) {
                stopped = true;
                return;
            }
            if (processed % BULK_PREFETCH_CAP_CHECK_EVERY === 0) {
                if ((await getArtworkCacheSizeBytes()) >= limitBytes) {
                    stopped = true;
                    return;
                }
            }
            processed += 1;
            const entry = queue[cursor];
            cursor += 1;
            if (entry) {
                await getArtworkLocalUri(entry.uri, entry.headers).catch(() => undefined);
            }
        }
    };

    const workerCount = Math.min(BULK_PREFETCH_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
};

/** Applies a new cap (bytes) and immediately evicts down to it. */
export const setArtworkCacheLimitBytes = (bytes: number): void => {
    limitBytes = Math.max(0, bytes);
    void pruneArtworkCacheToLimit();
};

/** Deletes every cached cover-art file and resets the index. */
export const clearArtworkCache = async (): Promise<void> => {
    try {
        await FileSystem.deleteAsync(ARTWORK_DIR, { idempotent: true });
    } catch {
        // ignore
    }
    const empty: ArtworkIndex = new Map();
    loadedIndex = empty;
    indexPromise = Promise.resolve(empty);
    inFlightDownloads.clear();
    await ensureDir();
    schedulePersist();
};

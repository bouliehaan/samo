import * as FileSystem from 'expo-file-system/legacy';

import { canonicalArtworkKey } from '../utils/artwork-canonical';
import { COVER_CACHE_WIDTH, withArtworkWidth } from '../utils/artwork-size';
import { safeParseJson } from '../utils/json';

/**
 * Managed on-disk cover-art cache that WE own, so the user's size limit is real
 * and enforceable (expo-image's built-in disk cache exposes neither a size nor a
 * cap). Artwork is downloaded once into a dedicated directory keyed by a hash of
 * the CANONICAL (token-stripped, width-free) remote URL — so a cover stays a
 * cache hit even after its stream token rotates, and whatever size a slot asks
 * for it at; a small persisted index tracks per-file bytes, width + last access
 * so we can report the total size and LRU-evict down to the cap.
 *
 * ArtworkImage feeds expo-image the returned `file://` uri with cachePolicy
 * "memory" — this directory is the single source of truth for on-disk art.
 */

const ARTWORK_DIR = `${FileSystem.documentDirectory ?? ''}samo-artwork/`;
const INDEX_FILE = `${ARTWORK_DIR}index.json`;
const PERSIST_DEBOUNCE_MS = 12_000;
/** See scheduleAccessPersist — lastAccess-only writes ride a far slower timer. */
const ACCESS_PERSIST_DEBOUNCE_MS = 5 * 60_000;
const PRUNE_DEBOUNCE_MS = 6_000;
// Bump when the on-disk filename scheme changes. v2 hashes the CANONICAL
// (token-stripped) URL; v1 filenames were hashed from token-bearing URLs and so
// can never match a v2 lookup — they're dropped once on first load (see
// loadIndex) and the bulk prefetch re-warms under stable keys. Taking the width
// out of the name did not need a bump: until covers were sized, no samo URL
// kept here carried one.
const INDEX_VERSION = 2;

export const DEFAULT_ARTWORK_CACHE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

interface ArtworkEntry {
    bytes: number;
    lastAccess: number;
    url?: string;
    /**
     * The width this copy was kept at; absent for a cover as the server
     * stores it.
     *
     * Recorded per copy rather than once for the cache, so a copy outlives a
     * change of `COVER_CACHE_WIDTH`. Phones kept originals until November
     * 2026: those still draw every slot they are wide enough for, and still
     * draw offline, until a library warm replaces each with a copy at the
     * cache's width. Dropping them on the change would have re-downloaded the
     * library before anything could be drawn from the cache again.
     */
    width?: number;
}

interface PersistedIndex {
    entries: Record<string, ArtworkEntry>;
    version: number;
}

interface CoverAddress {
    /** The file the cover is kept in, named for the cover with no width, so
     *  one file stands for it whatever size it is asked for at. */
    name: string;
    /** What a download fetches: a samo cover at the cache's width, anything
     *  else as it came. */
    url: string;
    /** The width `url` asks for; absent for the cover as the server stores it. */
    width?: number;
}

const ADDRESS_LIMIT = 4096;
const addresses = new Map<string, CoverAddress>();

/**
 * Where a cover is kept here. Every reader and writer — the library warm, a
 * detail page's prefetch, a tile's peek — means the same file by the same
 * cover, whatever size it asked for: a row's 128px cover and a hero's 1024px
 * one are the one cover, kept once at `COVER_CACHE_WIDTH`.
 *
 * Memoized, because recognising a samo URL parses it, and a peek is on the
 * render path of every tile.
 */
const addressOf = (url: string): CoverAddress => {
    let address = addresses.get(url);
    if (address === undefined) {
        if (addresses.size >= ADDRESS_LIMIT) {
            addresses.clear();
        }
        const cover = withArtworkWidth(url, undefined);
        const sized = withArtworkWidth(url, COVER_CACHE_WIDTH);
        address = {
            name: hashUrl(canonicalArtworkKey(cover)),
            url: sized,
            width: sized === cover ? undefined : COVER_CACHE_WIDTH,
        };
        addresses.set(url, address);
    }
    return address;
};

type ArtworkIndex = Map<string, ArtworkEntry>;

let indexPromise: Promise<ArtworkIndex> | null = null;
// Synchronous handle to the loaded index so display code can resolve a cache
// hit during render (no async flicker for already-cached art).
let loadedIndex: ArtworkIndex | null = null;
let limitBytes = DEFAULT_ARTWORK_CACHE_LIMIT_BYTES;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let accessPersistTimer: ReturnType<typeof setTimeout> | null = null;
let pruneTimer: ReturnType<typeof setTimeout> | null = null;
const inFlightDownloads = new Map<string, Promise<string | null>>();

/**
 * Running total of every tracked file's bytes.
 *
 * The bulk warm checks the cache size every 25 downloads to know when to stop,
 * and that check used to SUM THE WHOLE INDEX each time — O(n) on the JS thread,
 * repeated thousands of times across a full-library warm, on a structure that
 * grows as the warm proceeds. Maintaining the total at the four points that can
 * move it makes the check O(1).
 *
 * Every mutation of `loadedIndex`'s entries must go through the helpers below,
 * or this drifts and the size cap silently stops meaning anything.
 */
let totalCachedBytes = 0;

/** Fires whenever the synchronous index becomes available or an entry lands, so
 *  views that resolved to a remote URL before the index loaded can re-peek. */
const indexListeners = new Set<() => void>();

const notifyIndexListeners = (): void => {
    indexListeners.forEach((listener) => {
        try {
            listener();
        } catch {
            // a view listener must never break the cache
        }
    });
};

/**
 * Subscribe to "the local index changed".
 *
 * `warmArtworkCache()` is fire-and-forget at module load, so during boot —
 * exactly when the most tiles mount — `peekArtworkLocalUri` answers null for
 * everything. `ArtworkImage` pins that answer for the lifetime of the cover, so
 * a whole first screen of already-cached art was fetched over the network
 * instead. Views take this to learn that the index has arrived and re-peek once.
 */
export const subscribeArtworkIndex = (listener: () => void): (() => void) => {
    indexListeners.add(listener);
    return () => {
        indexListeners.delete(listener);
    };
};

/** True once the synchronous peek can give a trustworthy answer. */
export const isArtworkIndexLoaded = (): boolean => loadedIndex !== null;

const setIndexEntry = (index: ArtworkIndex, name: string, entry: ArtworkEntry): void => {
    const existing = index.get(name);
    if (existing) {
        totalCachedBytes -= existing.bytes;
    }
    index.set(name, entry);
    totalCachedBytes += entry.bytes;
};

const deleteIndexEntry = (index: ArtworkIndex, name: string): void => {
    const existing = index.get(name);
    if (!existing) {
        return;
    }
    totalCachedBytes -= existing.bytes;
    index.delete(name);
};

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
    totalCachedBytes = 0;
    try {
        const raw = await FileSystem.readAsStringAsync(INDEX_FILE);
        const parsed = safeParseJson<unknown>(raw);
        if (isCurrentPersistedIndex(parsed)) {
            for (const [name, entry] of Object.entries(parsed.entries)) {
                if (entry && typeof entry.bytes === 'number') {
                    setIndexEntry(index, name, {
                        bytes: entry.bytes,
                        lastAccess: typeof entry.lastAccess === 'number' ? entry.lastAccess : 0,
                        url: entry.url,
                        width: typeof entry.width === 'number' ? entry.width : undefined,
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
    // Views that mounted during boot pinned a null peek; tell them the index is
    // here so they can resolve to the local file instead of the network.
    notifyIndexListeners();
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
    const { name } = addressOf(remoteUrl);
    return loadedIndex.has(name) ? `${ARTWORK_DIR}${name}` : null;
};

export interface ArtworkCopy {
    uri: string;
    /** Whether the copy is as wide as the slot asking for it draws. */
    wideEnough: boolean;
}

/**
 * {@link peekArtworkLocalUri} for a slot that draws at `width` — a rung from
 * `getArtworkWidth`, or none for the cover as stored. The cache keeps each
 * cover at one width, so a slot larger than that is told the copy is too
 * small for it: still worth having, as what to show while the slot's own
 * size loads and what to draw when it cannot.
 */
export const peekArtworkCopy = (
    remoteUrl: string,
    width: number | undefined,
): ArtworkCopy | null => {
    if (!remoteUrl || !loadedIndex) {
        return null;
    }
    if (remoteUrl.startsWith('file://')) {
        return { uri: remoteUrl, wideEnough: true };
    }
    const { name } = addressOf(remoteUrl);
    const entry = loadedIndex.get(name);
    if (!entry) {
        return null;
    }
    return {
        uri: `${ARTWORK_DIR}${name}`,
        wideEnough: entry.width === undefined || (width !== undefined && width <= entry.width),
    };
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
    // A structural write supersedes a pending access-only one — it persists
    // the same lastAccess values on its way past.
    if (accessPersistTimer) {
        clearTimeout(accessPersistTimer);
        accessPersistTimer = null;
    }
    persistTimer = setTimeout(() => {
        persistTimer = null;
        void persistIndex();
    }, PERSIST_DEBOUNCE_MS);
};

/**
 * Persist scheduled for a `lastAccess` bump ALONE, on a much longer timer.
 *
 * Every cache HIT touches lastAccess, and routing that through schedulePersist
 * meant a full rewrite of the index every 12s for as long as the user kept
 * browsing — on a real 5,213-cover cache that is a 780KB serialize-and-write,
 * on the JS thread, growing with the cache, to record nothing but access times.
 *
 * The only thing lastAccess feeds is LRU eviction order, which tolerates being
 * coarse: the cost of losing the last few minutes of access times to a process
 * kill is that eviction picks a slightly different victim from a 5GB cache.
 */
const scheduleAccessPersist = (): void => {
    if (persistTimer || accessPersistTimer) {
        return;
    }
    accessPersistTimer = setTimeout(() => {
        accessPersistTimer = null;
        void persistIndex();
    }, ACCESS_PERSIST_DEBOUNCE_MS);
};

/** Evicts least-recently-used art until the cache fits under the current cap. */
export const pruneArtworkCacheToLimit = async (): Promise<void> => {
    const index = await getIndex();
    if (totalCachedBytes <= limitBytes) {
        return;
    }
    const entries = [...index.entries()].sort(
        (left, right) => left[1].lastAccess - right[1].lastAccess,
    );
    for (const [name] of entries) {
        if (totalCachedBytes <= limitBytes) {
            break;
        }
        try {
            await FileSystem.deleteAsync(`${ARTWORK_DIR}${name}`, { idempotent: true });
        } catch {
            // ignore — still drop it from the index so accounting stays honest
        }
        deleteIndexEntry(index, name);
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
    address: CoverAddress,
    fileUri: string,
    headers: Record<string, string> | undefined,
    replacing: boolean,
): Promise<string | null> => {
    // A replacement lands beside the copy it replaces and is renamed over it
    // (an atomic replace), so a download that fails leaves that copy as it was.
    const target = replacing ? `${fileUri}.part` : fileUri;
    try {
        await ensureDir();
        const result = await FileSystem.downloadAsync(
            address.url,
            target,
            headers ? { headers } : undefined,
        );
        if (result.status >= 400) {
            await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
            return null;
        }
        if (replacing) {
            await FileSystem.moveAsync({ from: target, to: fileUri });
        }
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
            return null;
        }
        const index = await getIndex();
        setIndexEntry(index, address.name, {
            bytes: info.size,
            lastAccess: Date.now(),
            url: canonicalArtworkKey(address.url),
            width: address.width,
        });
        schedulePersist();
        schedulePrune();
        // A cover that just landed is a cover a mounted tile may still be
        // waiting on over the network.
        notifyIndexListeners();
        return fileUri;
    } catch {
        return null;
    }
};

const cacheArtwork = async (
    requestedUrl: string,
    headers: Record<string, string> | undefined,
    replaceOtherWidths: boolean,
): Promise<string | null> => {
    if (!requestedUrl || requestedUrl.startsWith('file://')) {
        return requestedUrl || null;
    }
    // The filename is the CANONICAL (token-stripped) cover, so the file is a
    // hit across token rotations; the fetch still uses the full URL.
    const address = addressOf(requestedUrl);
    const { name } = address;
    const fileUri = `${ARTWORK_DIR}${name}`;

    const index = await getIndex();
    const existing = index.get(name);
    let replacing = false;
    if (existing) {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
            existing.lastAccess = Date.now();
            // Access-only: nothing was added or removed, so this must not drag
            // the whole index through a rewrite on the fast timer.
            scheduleAccessPersist();
            if (!replaceOtherWidths || existing.width === address.width) {
                return fileUri;
            }
            replacing = true;
        } else {
            // The file vanished under us (an external clear, a failed write).
            // Drop the entry through the accounting helper so the running
            // total does not keep charging for bytes that are not on disk.
            deleteIndexEntry(index, name);
        }
    }

    const pending = inFlightDownloads.get(name);
    if (pending) {
        return pending;
    }
    const download = downloadArtwork(address, fileUri, headers, replacing).finally(() => {
        inFlightDownloads.delete(name);
    });
    inFlightDownloads.set(name, download);
    return download;
};

/**
 * Resolves a remote artwork URL to a local `file://` uri, downloading + caching
 * it on first request. Returns null on failure so the caller can fall back to the
 * remote URL. Concurrent requests for the same URL share a single download.
 *
 * Any copy of the cover answers, whatever width it was kept at: replacing one
 * kept at another width is the library warm's job, on a network where the
 * bytes are free.
 */
export const getArtworkLocalUri = (
    requestedUrl: string,
    headers?: Record<string, string>,
): Promise<string | null> => cacheArtwork(requestedUrl, headers, false);

/** Total bytes currently held in the managed cover-art cache. */
export const getArtworkCacheSizeBytes = async (): Promise<number> => {
    await getIndex();
    return totalCachedBytes;
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
 *
 * A copy kept at another width than the cache's is not "already cached": it
 * is replaced, which is how a cache of originals becomes one of covers sized
 * for the tiles drawing them.
 */
export const prefetchArtworkUrls = async (
    entries: ArtworkPrefetchEntry[],
    options?: { isCancelled?: () => boolean },
): Promise<void> => {
    const index = await getIndex();
    const seen = new Set<string>();
    const queue = entries.filter((entry) => {
        if (!entry.uri || entry.uri.startsWith('file://')) {
            return false;
        }
        // De-dup by cover so the same one asked for at different sizes, or
        // with different stream tokens, collapses to one download.
        const { name, width } = addressOf(entry.uri);
        const kept = index.get(name);
        if (
            seen.has(name) ||
            // Already cached at the cache's width — skipped on the index alone,
            // so a warm-cache launch does NOT do a native `getInfoAsync` stat
            // for every one of thousands of covers.
            (kept !== undefined && kept.width === width)
        ) {
            return false;
        }
        seen.add(name);
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
                await cacheArtwork(entry.uri, entry.headers, true).catch(() => undefined);
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
    totalCachedBytes = 0;
    indexPromise = Promise.resolve(empty);
    inFlightDownloads.clear();
    await ensureDir();
    schedulePersist();
    notifyIndexListeners();
};

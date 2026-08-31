import { type DownloadEntry, subscribeDownloads } from '../services/download-manager';
import {
    getDownloadedCollectionKey,
    getDownloadedTrackKey,
} from '../utils/download-keys';
import {
    DOWNLOAD_PROGRESS_START,
    getEntryProgress,
    pickLatestEntryPerTrack,
    summarizeDownloadEntries,
} from '../utils/download-progress';
import { useStoreSelector } from './use-store-selector';

// ---------------------------------------------------------------------------
// In-flight download progress, keyed the same way the downloaded tick is.
//
// This is deliberately NOT a slice of downloads-state. That store publishes the
// *finished* picture — key Sets that turn over a handful of times a session —
// and every screen showing a downloaded tick subscribes to it. Progress ticks
// arrive up to ~7 times a second while a transfer runs; routing them through
// that store would wake all of its subscribers on every one. Here the only
// components woken are the ones drawing an arc, and only when their own number
// moved.
//
// Nothing is published at rest: with no download running both maps are empty
// and no listener is ever called.
// ---------------------------------------------------------------------------

export type DownloadProgressScope = 'collection' | 'track';

type DownloadProgressIndex = {
    collections: ReadonlyMap<string, number>;
    tracks: ReadonlyMap<string, number>;
};

const EMPTY_INDEX: DownloadProgressIndex = {
    collections: new Map(),
    tracks: new Map(),
};

let progressIndex: DownloadProgressIndex = EMPTY_INDEX;
const progressListeners = new Set<() => void>();

// Collections/tracks a download has been asked for, against the wall clock at
// the moment of the ask. The registry stamps `enqueuedAt` off the same clock
// (System.currentTimeMillis), so an entry at or after that mark is this
// request's own work arriving and the stand-in can stop covering for it. Older
// entries — the half of an album that was already on disk — must not retire it,
// or the arc would stay dark for the whole detail fetch.
const requestedCollections = new Map<string, number>();
const requestedTracks = new Map<string, number>();
/** Track counts the caller knew up front — see `summarizeDownloadEntries`. */
const collectionExpectations = new Map<string, number>();

// 1% steps: finer than the eye reads on a 16px ring, and the same resolution
// the native side already gates progress events at, so quantising here costs no
// fidelity and stops fractional jitter from re-rendering a tile.
const quantize = (progress: number) => Math.round(progress * 100) / 100;

const sameProgress = (
    a: ReadonlyMap<string, number>,
    b: ReadonlyMap<string, number>,
): boolean => {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
        if (b.get(key) !== value) return false;
    }
    return true;
};

const retireCoveredRequests = (entries: DownloadEntry[]) => {
    if (requestedCollections.size === 0 && requestedTracks.size === 0) return;
    for (const entry of entries) {
        const collectionKey = getDownloadedCollectionKey(
            entry.collection.sourceId,
            entry.collection.id,
        );
        const collectionRequestedAt = requestedCollections.get(collectionKey);
        if (collectionRequestedAt !== undefined && entry.enqueuedAt >= collectionRequestedAt) {
            requestedCollections.delete(collectionKey);
        }
        const trackKey = getDownloadedTrackKey(entry.collection.sourceId, entry.trackId);
        const trackRequestedAt = requestedTracks.get(trackKey);
        if (trackRequestedAt !== undefined && entry.enqueuedAt >= trackRequestedAt) {
            requestedTracks.delete(trackKey);
        }
    }
};

const buildProgressIndex = (entries: DownloadEntry[]): DownloadProgressIndex => {
    retireCoveredRequests(entries);

    // Pass 1: which collections have anything in flight? A registry that has
    // been in use for a while holds thousands of finished entries and none of
    // them can contribute to an arc.
    const liveCollectionKeys = new Set<string>();
    for (const entry of entries) {
        if (entry.status !== 'queued' && entry.status !== 'downloading') continue;
        liveCollectionKeys.add(
            getDownloadedCollectionKey(entry.collection.sourceId, entry.collection.id),
        );
    }

    // Pass 2: gather only those collections, newest entry per track.
    const byCollection = new Map<string, DownloadEntry[]>();
    for (const entry of entries) {
        const key = getDownloadedCollectionKey(
            entry.collection.sourceId,
            entry.collection.id,
        );
        if (!liveCollectionKeys.has(key)) continue;
        const bucket = byCollection.get(key);
        if (bucket) {
            bucket.push(entry);
        } else {
            byCollection.set(key, [entry]);
        }
    }

    const collections = new Map<string, number>();
    const tracks = new Map<string, number>();
    for (const [key, bucket] of byCollection) {
        const latest = [...pickLatestEntryPerTrack(bucket).values()];
        const summary = summarizeDownloadEntries(latest, {
            expectedCount: collectionExpectations.get(key),
        });
        // A finished collection hands over to the downloaded tick — one badge at
        // a time, and no arc left sitting at 100%.
        if (summary.active && !summary.completed) {
            collections.set(key, quantize(summary.progress));
        }
        for (const entry of latest) {
            if (entry.status !== 'queued' && entry.status !== 'downloading') continue;
            tracks.set(
                getDownloadedTrackKey(entry.collection.sourceId, entry.trackId),
                quantize(getEntryProgress(entry)),
            );
        }
    }

    for (const key of requestedCollections.keys()) {
        if (!collections.has(key)) {
            collections.set(key, DOWNLOAD_PROGRESS_START);
        }
    }
    for (const key of requestedTracks.keys()) {
        if (!tracks.has(key)) {
            tracks.set(key, DOWNLOAD_PROGRESS_START);
        }
    }

    // An expectation only exists to steady an arc that is on screen.
    for (const key of collectionExpectations.keys()) {
        if (!collections.has(key)) {
            collectionExpectations.delete(key);
        }
    }

    return { collections, tracks };
};

let latestEntries: DownloadEntry[] = [];

const republish = () => {
    const next = buildProgressIndex(latestEntries);
    if (
        sameProgress(next.collections, progressIndex.collections) &&
        sameProgress(next.tracks, progressIndex.tracks)
    ) {
        return;
    }
    progressIndex = next;
    progressListeners.forEach((listener) => listener());
};

subscribeDownloads((entries) => {
    latestEntries = entries;
    republish();
});

const subscribeProgress = (listener: () => void): (() => void) => {
    progressListeners.add(listener);
    return () => {
        progressListeners.delete(listener);
    };
};

/**
 * Show an arc immediately, before the registry has an entry to drive it. The
 * gap is real: a collection download started from a tile has to load the detail
 * first, and a podcast episode has to mint a stream token.
 */
export const markDownloadRequested = (
    scope: DownloadProgressScope,
    key: string,
    expectedTrackCount?: number,
) => {
    if (scope === 'collection') {
        if (!requestedCollections.has(key)) {
            requestedCollections.set(key, Date.now());
        }
        if (expectedTrackCount && expectedTrackCount > 0) {
            collectionExpectations.set(key, expectedTrackCount);
        }
    } else if (!requestedTracks.has(key)) {
        requestedTracks.set(key, Date.now());
    }
    republish();
};

/**
 * Nothing was actually enqueued — no downloadable tracks, no server, an error,
 * or it was all on disk already. Take the arc back down instead of leaving it
 * stuck at its opening sliver.
 */
export const clearDownloadRequested = (scope: DownloadProgressScope, key: string) => {
    if (scope === 'collection') {
        requestedCollections.delete(key);
        collectionExpectations.delete(key);
    } else {
        requestedTracks.delete(key);
    }
    republish();
};

/**
 * How far along this collection/track is, 0 when nothing is in flight. A number,
 * not an object, so the selector bails out on every tick that didn't move THIS
 * item — see the note in `use-store-selector`.
 */
export const useDownloadProgress = (
    scope: DownloadProgressScope,
    key: string | null,
): number =>
    useStoreSelector(subscribeProgress, () => progressIndex, (index) => {
        if (!key) return 0;
        const map = scope === 'collection' ? index.collections : index.tracks;
        return map.get(key) ?? 0;
    });

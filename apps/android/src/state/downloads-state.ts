
import { useStoreSelector } from './use-store-selector';

import {
    DEFAULT_ARTWORK_CACHE_LIMIT_BYTES,
    setArtworkCacheLimitBytes as applyArtworkCacheLimitBytes,
    warmArtworkCache,
} from '../services/artwork-cache';
import {
    loadArtworkCacheLimitBytes,
    saveArtworkCacheLimitBytes,
} from '../services/artwork-cache-settings';
import { subscribeDownloads } from '../services/download-manager';
import {
    buildDownloadedCollectionSnapshot,
    EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT,
    type DownloadedCollectionSnapshot,
    type DownloadedCollectionSummary,
} from '../utils/downloaded-collections';

// Offline mode used to live here as `isOfflineMode`, which put a network fact
// inside the downloads store and left it as the only thing that knew about it.
// It now belongs to `state/network-state.ts`, which owns connectivity, server
// reachability and the user's preference together and derives ONE answer from
// the three.
export type DownloadsState = {
    artworkCacheLimitBytes: number;
    downloadedCollectionKeys: Set<string>;
    downloadedCollections: DownloadedCollectionSummary[];
    downloadedTrackKeys: Set<string>;
};

const initialDownloadsState: DownloadsState = {
    artworkCacheLimitBytes: DEFAULT_ARTWORK_CACHE_LIMIT_BYTES,
    downloadedCollectionKeys: new Set(),
    downloadedCollections: [],
    downloadedTrackKeys: new Set(),
};

type DownloadsAction =
    | { type: 'apply-snapshot'; snapshot: DownloadedCollectionSnapshot }
    | { type: 'set-artwork-cache-limit'; bytes: number };

const downloadsReducer = (state: DownloadsState, action: DownloadsAction): DownloadsState => {
    switch (action.type) {
        case 'apply-snapshot':
            return {
                ...state,
                downloadedCollectionKeys: action.snapshot.keys,
                downloadedCollections: action.snapshot.collections,
                downloadedTrackKeys: action.snapshot.trackKeys,
            };
        case 'set-artwork-cache-limit':
            return { ...state, artworkCacheLimitBytes: action.bytes };
        default:
            return state;
    }
};

// ---------------------------------------------------------------------------
// Module-level singleton store (same pattern as app-session.ts / playback-store.ts).
//
// Previously a per-call useReducer inside `useDownloadsState`, which meant
// every download-progress tick dispatched into whichever component happened to
// host the hook — typically App.tsx — causing the entire tree to re-render.
// Lifting to a module-level store lets every consumer share one copy AND
// lets components subscribe to fine-grained slices via useDownloadsSelector.
// ---------------------------------------------------------------------------

let downloadsState: DownloadsState = initialDownloadsState;
const downloadsListeners = new Set<() => void>();

const dispatchDownloads = (action: DownloadsAction): void => {
    const next = downloadsReducer(downloadsState, action);
    if (Object.is(next, downloadsState)) {
        return;
    }
    downloadsState = next;
    downloadsListeners.forEach((listener) => listener());
};

const subscribeDownloadsStore = (listener: () => void): (() => void) => {
    downloadsListeners.add(listener);
    return () => {
        downloadsListeners.delete(listener);
    };
};

const getDownloadsState = () => downloadsState;

// Snapshot cache lives at module level now — previously it was a useRef inside
// the hook, but it's really cache state for the subscription dedup, not
// per-component state.
let downloadedCollectionSnapshotCache: DownloadedCollectionSnapshot =
    EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT;

// Module-level setters — stable identity, no useCallback needed.
const setArtworkCacheLimit = (bytes: number) => {
    const next = Math.max(0, Math.round(bytes));
    dispatchDownloads({ type: 'set-artwork-cache-limit', bytes: next });
    applyArtworkCacheLimitBytes(next);
    void saveArtworkCacheLimitBytes(next);
};

// ---------------------------------------------------------------------------
// Boot-time side effects — run once when the module loads, not per-component.
// These are the same effects that lived in the old useEffect([], []) hooks.
// ---------------------------------------------------------------------------

let _booted = false;

const bootDownloadsStore = () => {
    if (_booted) return;
    _booted = true;

    // Warm the artwork index up front so the first render can resolve covers
    // without flicker. (The catalog itself is Kotlin-owned now — its reader
    // warms at native engine init, no JS warm needed.)
    warmArtworkCache();

    void loadArtworkCacheLimitBytes().then((bytes) => {
        // Apply the persisted cap to the cache on launch (this also evicts
        // down to it) and reflect it in state for the Settings UI.
        applyArtworkCacheLimitBytes(bytes);
        dispatchDownloads({ type: 'set-artwork-cache-limit', bytes });
    });

    // Subscribe to native download-manager changes — the snapshot dedup
    // prevents dispatching when nothing meaningful changed.
    subscribeDownloads((entries) => {
        const nextSnapshot = buildDownloadedCollectionSnapshot(entries);
        if (downloadedCollectionSnapshotCache.signature === nextSnapshot.signature) {
            return;
        }
        downloadedCollectionSnapshotCache = nextSnapshot;
        dispatchDownloads({ type: 'apply-snapshot', snapshot: nextSnapshot });
    });
};

// Boot eagerly when the module loads.
bootDownloadsStore();

// Exported for event handlers that read downloads state at call time without
// subscribing (module-store getter, same pattern as playback-store), and for
// components that only WRITE and shouldn't subscribe at all.
export const getDownloadsSnapshot = () => downloadsState;
export { setArtworkCacheLimit };

/**
 * Subscribe to a single slice of the downloads state. Consumers that only need
 * one field (e.g. offline mode, or download keys) re-render when THAT field
 * changes instead of on every snapshot update.
 */
export const useDownloadsSelector = <Selected>(
    selector: (state: DownloadsState) => Selected,
): Selected => useStoreSelector(subscribeDownloadsStore, () => downloadsState, selector);

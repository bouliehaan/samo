import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
    DEFAULT_ARTWORK_CACHE_LIMIT_BYTES,
    setArtworkCacheLimitBytes as applyArtworkCacheLimitBytes,
    warmArtworkCache,
} from '../services/artwork-cache';
import {
    loadArtworkCacheLimitBytes,
    saveArtworkCacheLimitBytes,
} from '../services/artwork-cache-settings';
import { warmCatalogDatabase } from '../services/catalog/database';
import { subscribeDownloads } from '../services/download-manager';
import { loadOfflineModePreference } from '../services/offline-mode';
import {
    buildDownloadedCollectionSnapshot,
    EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT,
    type DownloadedCollectionSnapshot,
    type DownloadedCollectionSummary,
} from '../utils/downloaded-collections';

export type DownloadsState = {
    artworkCacheLimitBytes: number;
    downloadedCollectionKeys: Set<string>;
    downloadedCollections: DownloadedCollectionSummary[];
    downloadedTrackKeys: Set<string>;
    isOfflineMode: boolean;
};

const initialDownloadsState: DownloadsState = {
    artworkCacheLimitBytes: DEFAULT_ARTWORK_CACHE_LIMIT_BYTES,
    downloadedCollectionKeys: new Set(),
    downloadedCollections: [],
    downloadedTrackKeys: new Set(),
    isOfflineMode: false,
};

type DownloadsAction =
    | { type: 'apply-snapshot'; snapshot: DownloadedCollectionSnapshot }
    | { type: 'set-artwork-cache-limit'; bytes: number }
    | { type: 'set-offline-mode'; isOfflineMode: boolean };

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
        case 'set-offline-mode':
            return { ...state, isOfflineMode: action.isOfflineMode };
        default:
            return state;
    }
};

export const useDownloadsState = () => {
    const [state, dispatch] = useReducer(downloadsReducer, initialDownloadsState);
    const snapshotRef = useRef<DownloadedCollectionSnapshot>(EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT);

    const setIsOfflineMode = useCallback(
        (isOfflineMode: boolean | ((current: boolean) => boolean)) => {
            dispatch({
                type: 'set-offline-mode',
                isOfflineMode:
                    typeof isOfflineMode === 'function'
                        ? isOfflineMode(state.isOfflineMode)
                        : isOfflineMode,
            });
        },
        [state.isOfflineMode],
    );

    const setArtworkCacheLimit = useCallback((bytes: number) => {
        const next = Math.max(0, Math.round(bytes));
        dispatch({ type: 'set-artwork-cache-limit', bytes: next });
        applyArtworkCacheLimitBytes(next);
        void saveArtworkCacheLimitBytes(next);
    }, []);

    useEffect(() => {
        let isMounted = true;

        // Warm the catalog (writer migrates; reader connection opens) and the
        // artwork index up front so the first render can resolve both
        // synchronously — no loading state, no cover-art flicker.
        warmCatalogDatabase();
        warmArtworkCache();

        void loadOfflineModePreference().then((next) => {
            if (isMounted) {
                dispatch({ type: 'set-offline-mode', isOfflineMode: next });
            }
        });

        void loadArtworkCacheLimitBytes().then((bytes) => {
            // Apply the persisted cap to the cache on launch (this also evicts
            // down to it) and reflect it in state for the Settings UI.
            applyArtworkCacheLimitBytes(bytes);
            if (isMounted) {
                dispatch({ type: 'set-artwork-cache-limit', bytes });
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeDownloads((entries) => {
            const nextSnapshot = buildDownloadedCollectionSnapshot(entries);
            if (snapshotRef.current.signature === nextSnapshot.signature) {
                return;
            }
            snapshotRef.current = nextSnapshot;
            dispatch({ type: 'apply-snapshot', snapshot: nextSnapshot });
        });

        return unsubscribe;
    }, []);

    return {
        ...state,
        downloadedCollectionSnapshotRef: snapshotRef,
        setArtworkCacheLimit,
        setIsOfflineMode,
    };
};

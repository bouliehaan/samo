import { useCallback, useEffect, useReducer, useRef } from 'react';

import { subscribeDownloads } from '../services/download-manager';
import {
    buildDownloadedCollectionSnapshot,
    EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT,
    type DownloadedCollectionSnapshot,
    type DownloadedCollectionSummary,
} from '../utils/downloaded-collections';
import { loadOfflineModePreference } from '../services/offline-mode';

export type DownloadsState = {
    downloadedCollectionKeys: Set<string>;
    downloadedCollections: DownloadedCollectionSummary[];
    downloadedTrackKeys: Set<string>;
    isOfflineMode: boolean;
};

const initialDownloadsState: DownloadsState = {
    downloadedCollectionKeys: new Set(),
    downloadedCollections: [],
    downloadedTrackKeys: new Set(),
    isOfflineMode: false,
};

type DownloadsAction =
    | { type: 'apply-snapshot'; snapshot: DownloadedCollectionSnapshot }
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

    useEffect(() => {
        let isMounted = true;

        void loadOfflineModePreference().then((next) => {
            if (isMounted) {
                dispatch({ type: 'set-offline-mode', isOfflineMode: next });
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
        setIsOfflineMode,
    };
};

import { useMemo } from 'react';

import { useAppNavigationSelector } from '../state/app-navigation';
import { useAuthSessionSelector } from '../state/auth-session';
import { useDownloadsSelector } from '../state/downloads-state';
import { buildOfflineHomeContentState } from '../utils/offline-home';
import { getDownloadedCollectionKey } from '../utils/download-keys';

export const useVisibleHomeContentState = () => {
    const homeContentState = useAppNavigationSelector((state) => state.homeContentState);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isOfflineMode = useDownloadsSelector((state) => state.isOfflineMode);
    // Guarded: while online these stay a stable null, so download-snapshot
    // churn never re-renders the Home surface through this hook.
    const downloadedCollections = useDownloadsSelector((state) =>
        state.isOfflineMode ? state.downloadedCollections : null,
    );
    const downloadedCollectionKeys = useDownloadsSelector((state) =>
        state.isOfflineMode ? state.downloadedCollectionKeys : null,
    );

    return useMemo(() => {
        if (!isOfflineMode || !downloadedCollections || !downloadedCollectionKeys) {
            return homeContentState;
        }
        const offlineContentState = buildOfflineHomeContentState(
            downloadedCollections,
            serverConnection,
        );
        if (homeContentState.status !== 'loaded') {
            return offlineContentState;
        }
        const filteredSections = homeContentState.content.sections
            .map((section) => ({
                ...section,
                items: section.items.filter((item) =>
                    downloadedCollectionKeys.has(
                        getDownloadedCollectionKey(item.source?.id, item.id),
                    ),
                ),
            }))
            .filter((section) => section.items.length > 0);
        if (filteredSections.length === 0) {
            return offlineContentState;
        }
        return {
            ...homeContentState,
            content: {
                ...homeContentState.content,
                sections: filteredSections,
            },
        };
    }, [
        downloadedCollectionKeys,
        downloadedCollections,
        homeContentState,
        isOfflineMode,
        serverConnection,
    ]);
};

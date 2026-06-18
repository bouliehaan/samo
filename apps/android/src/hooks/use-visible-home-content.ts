import { useMemo } from 'react';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { useAppNavigationSelector } from '../state/app-navigation';
import { useAuthSessionState } from '../state/auth-session';
import { useDownloadsState } from '../state/downloads-state';
import { buildOfflineHomeContentState } from '../utils/offline-home';
import { getDownloadedCollectionKey } from '../utils/download-keys';

export const useVisibleHomeContentState = () => {
    const homeContentState = useAppNavigationSelector((state) => state.homeContentState);
    const { serverConnection } = useAuthSessionState();
    const { downloadedCollections, downloadedCollectionKeys, isOfflineMode } = useDownloadsState();

    return useMemo(() => {
        if (!isOfflineMode) {
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

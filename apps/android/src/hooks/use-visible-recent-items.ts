import { useMemo } from 'react';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { type MobileHomeItem } from '@samo/core/mobile';

import { useAppNavigationSelector } from '../state/app-navigation';
import { useAppSessionSelector } from '../state/app-session';
import { useAuthSessionSelector } from '../state/auth-session';
import { useDownloadsSelector } from '../state/downloads-state';
import { getDownloadedCollectionKey } from '../utils/download-keys';
import { isEligibleRecentlyPlayedSurfaceItem, getRecentContentItemKey, type AndroidRecentContentSourceItem } from '../services/recent-content';
import { resolveItemArtworkUrl } from '../utils/home-display';

export const useVisibleRecentItems = () => {
    const homeContentState = useAppNavigationSelector((state) => state.homeContentState);
    const recentContentItems = useAppSessionSelector((state) => state.recentContentItems);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isOfflineMode = useDownloadsSelector((state) => state.isOfflineMode);
    // Guarded: stable null while online, so download churn skips this hook.
    const downloadedCollectionKeys = useDownloadsSelector((state) =>
        state.isOfflineMode ? state.downloadedCollectionKeys : null,
    );

    return useMemo(() => {
        const withoutArtists = recentContentItems.filter((entry) =>
            isEligibleRecentlyPlayedSurfaceItem(entry.item, { directSong: entry.directSong }),
        );
        const filtered = isOfflineMode && downloadedCollectionKeys
            ? withoutArtists.filter((entry) =>
                  downloadedCollectionKeys.has(
                      getDownloadedCollectionKey(entry.item.source?.id, entry.item.id),
                  ),
              )
            : withoutArtists;
        
        const freshByKey = new Map<string, AndroidRecentContentSourceItem>();
        if (homeContentState.status === 'loaded') {
            for (const section of homeContentState.content.sections) {
                for (const item of section.items) {
                    const key = getRecentContentItemKey(item);
                    if (!freshByKey.has(key)) {
                        freshByKey.set(key, item);
                    }
                }
            }
        }
        return filtered.map((entry) => {
            const fresh = freshByKey.get(entry.key);
            const merged: AndroidRecentContentSourceItem = fresh
                ? {
                      ...entry.item,
                      artworkImageId: entry.item.artworkImageId ?? fresh.artworkImageId,
                      artworkUrl: entry.item.artworkUrl ?? fresh.artworkUrl,
                      isHiRes: entry.item.isHiRes ?? fresh.isHiRes,
                      qualityProfile:
                          'qualityProfile' in entry.item
                              ? (entry.item.qualityProfile ?? fresh.qualityProfile)
                              : fresh.qualityProfile,
                  }
                : entry.item;
            
            if (!merged.artworkUrl && !merged.artworkImageId) {
                const resolved = resolveItemArtworkUrl(merged, serverConnection);
                if (resolved) {
                    return { ...entry, item: { ...merged, artworkUrl: resolved } };
                }
            }
            return merged === entry.item ? entry : { ...entry, item: merged };
        });
    }, [
        recentContentItems,
        isOfflineMode,
        downloadedCollectionKeys,
        serverConnection,
        homeContentState,
    ]);
};

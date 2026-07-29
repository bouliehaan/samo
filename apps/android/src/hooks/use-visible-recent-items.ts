import { useMemo } from 'react';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { type MobileHomeItem } from '@samo/core/mobile';

import { useAppNavigationSelector } from '../state/app-navigation';
import { useAppSessionSelector } from '../state/app-session';
import { useAuthSessionSelector } from '../state/auth-session';
import { isEligibleRecentlyPlayedSurfaceItem, getRecentContentItemKey, type AndroidRecentContentSourceItem } from '../services/recent-content';
import { resolveItemArtworkUrl } from '../utils/home-display';

/**
 * Recently played, as shown on Home.
 *
 * Offline no longer scrubs this down to downloaded items. Every one of them
 * opens from the on-device mirror with no network, and a history that empties
 * itself when the Wi-Fi drops is a worse answer than one that shows what you
 * were listening to and declines to play the parts that aren't here.
 */
export const useVisibleRecentItems = () => {
    const homeContentState = useAppNavigationSelector((state) => state.homeContentState);
    const recentContentItems = useAppSessionSelector((state) => state.recentContentItems);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);

    return useMemo(() => {
        const filtered = recentContentItems.filter((entry) =>
            isEligibleRecentlyPlayedSurfaceItem(entry.item, { directSong: entry.directSong }),
        );

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
    }, [recentContentItems, serverConnection, homeContentState]);
};

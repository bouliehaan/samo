import {
    loadSamoRecentlyPlayedHomeItems,
    type MobileHomeContent,
    type MobileHomeItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import {
    type AndroidRecentContentItem,
    getRecentContentItemKey,
    isEligibleRecentlyPlayedSurfaceItem,
    upsertRecentContentItem,
} from './recent-content';

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

const toRecentContentItem = (item: MobileHomeItem): AndroidRecentContentItem | null => {
    if (!isEligibleRecentlyPlayedSurfaceItem(item)) {
        return null;
    }

    const playedAt = item.lastPlayedAt;
    if (!playedAt || playedAt <= 0) {
        return null;
    }

    return {
        item,
        key: getRecentContentItemKey(item),
        selectedAt: playedAt,
    };
};

export const mergeServerRecentlyPlayedIntoRecents = async (
    localItems: AndroidRecentContentItem[],
    authentication: ServerAuthenticationResult | null,
    homeContent?: MobileHomeContent,
): Promise<AndroidRecentContentItem[]> => {
    const freshByKey = new Map<string, MobileHomeItem>();
    if (homeContent) {
        for (const section of homeContent.sections) {
            for (const item of section.items) {
                freshByKey.set(getRecentContentItemKey(item), item);
            }
        }
    }

    const localByKey = new Map(localItems.map((entry) => [entry.key, entry]));
    let merged = localItems.filter((entry) =>
        isEligibleRecentlyPlayedSurfaceItem(entry.item, { directSong: entry.directSong }),
    );

    if (authentication) {
        let serverItems: MobileHomeItem[] = [];
        try {
            serverItems = await loadSamoRecentlyPlayedHomeItems(authentication, samoFetch, 48);
        } catch {
            // best effort
        }

        for (const serverItem of serverItems) {
            const key = getRecentContentItemKey(serverItem);
            const recentEntry = toRecentContentItem(
                freshByKey.get(key) ?? serverItem,
            );
            if (!recentEntry) {
                continue;
            }

            const localEntry = localByKey.get(key);
            if (!localEntry || recentEntry.selectedAt >= localEntry.selectedAt) {
                merged = upsertRecentContentItem(
                    merged,
                    recentEntry.item,
                    recentEntry.selectedAt,
                );
                localByKey.set(key, recentEntry);
            }
        }
    }

    return merged.sort((left, right) => right.selectedAt - left.selectedAt);
};

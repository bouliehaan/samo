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

    const merged = localItems.filter((entry) =>
        isEligibleRecentlyPlayedSurfaceItem(entry.item, { directSong: entry.directSong }),
    );
    // Preserve the order of items already on screen (first painted from disk) so
    // this async server merge never reshuffles cards mid-session — the cold-boot
    // "recently played shifts around and flashes" report. Existing items only
    // get their payload/timestamp refreshed IN PLACE; genuinely-new server items
    // are appended (they weren't visible, so adding them shifts nothing). New
    // plays on THIS device still arrive at the top via recordRecentContentItem.
    const mergedByKey = new Map(merged.map((entry) => [entry.key, entry]));
    const orderedKeys = merged.map((entry) => entry.key);

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

            const existing = mergedByKey.get(key);
            if (existing) {
                if (recentEntry.selectedAt >= existing.selectedAt) {
                    mergedByKey.set(key, {
                        ...existing,
                        item: recentEntry.item,
                        selectedAt: recentEntry.selectedAt,
                    });
                }
            } else {
                mergedByKey.set(key, recentEntry);
                orderedKeys.push(key);
            }
        }
    }

    return orderedKeys.map((key) => mergedByKey.get(key)!);
};

import {
    type MobileHomeItem,
    MobileHomeItemType,
    MobileSearchItemType,
} from '@samo/core/mobile';

import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
    MAX_RECENT_CONTENT_ITEMS,
} from '../services/recent-content';
import { mergeContentItemSignals } from './content-item';

export const normalizeAlbumTitleKey = (title: string) =>
    title.trim().toLowerCase().replace(/\s+/g, ' ');

export const isAlbumContentItem = (item: { type: string }) =>
    item.type === MobileHomeItemType.ALBUM || item.type === MobileSearchItemType.ALBUM;

export const getCanonicalAlbumIdentityKey = (item: {
    title: string;
    source?: { id: string };
    type: string;
}): string | undefined => {
    if (!isAlbumContentItem(item)) {
        return undefined;
    }

    const title = normalizeAlbumTitleKey(item.title);
    if (!title) {
        return undefined;
    }

    return `${item.source?.id ?? 'server'}:album:${title}`;
};

const pickRecentAlbumEntry = (
    left: AndroidRecentContentItem,
    right: AndroidRecentContentItem,
    preferredItem?: AndroidRecentContentSourceItem,
): AndroidRecentContentItem => {
    const keeper = right.selectedAt >= left.selectedAt ? right : left;
    const other = keeper === right ? left : right;
    const baseItem = preferredItem ?? keeper.item;
    const mergedItem = mergeContentItemSignals(other.item, baseItem);

    return {
        item: {
            ...mergedItem,
            id: baseItem.id,
            source: baseItem.source ?? mergedItem.source,
            subtitle: baseItem.subtitle ?? mergedItem.subtitle,
            title: baseItem.title,
            type: baseItem.type,
        },
        key: getRecentContentItemKey(baseItem),
        selectedAt: Math.max(left.selectedAt, right.selectedAt),
    };
};

export const dedupeRecentContentItemsByAlbumIdentity = (
    items: AndroidRecentContentItem[],
): AndroidRecentContentItem[] => {
    const nonAlbums: AndroidRecentContentItem[] = [];
    const albumsByCanonical = new Map<string, AndroidRecentContentItem>();

    for (const entry of items) {
        const canonical = getCanonicalAlbumIdentityKey(entry.item);
        if (!canonical) {
            nonAlbums.push(entry);
            continue;
        }

        const existing = albumsByCanonical.get(canonical);
        if (!existing) {
            albumsByCanonical.set(canonical, entry);
            continue;
        }

        albumsByCanonical.set(canonical, pickRecentAlbumEntry(existing, entry));
    }

    return [...nonAlbums, ...albumsByCanonical.values()]
        .sort((left, right) => right.selectedAt - left.selectedAt)
        .slice(0, MAX_RECENT_CONTENT_ITEMS);
};

export const collectFreshAlbumItems = (sections: Array<{ items: MobileHomeItem[] }>) =>
    sections.flatMap((section) => section.items.filter(isAlbumContentItem));

export const reconcileRecentContentItems = (
    items: AndroidRecentContentItem[],
    freshAlbumItems: AndroidRecentContentSourceItem[],
): AndroidRecentContentItem[] => {
    const freshByKey = new Map<string, AndroidRecentContentSourceItem>();
    const freshByCanonical = new Map<string, AndroidRecentContentSourceItem>();

    for (const item of freshAlbumItems) {
        freshByKey.set(getRecentContentItemKey(item), item);
        const canonical = getCanonicalAlbumIdentityKey(item);
        if (canonical && !freshByCanonical.has(canonical)) {
            freshByCanonical.set(canonical, item);
        }
    }

    const reconciled = items.map((entry) => {
        if (!isAlbumContentItem(entry.item)) {
            return entry;
        }

        const freshById = freshByKey.get(entry.key);
        if (freshById) {
            return {
                ...entry,
                item: {
                    ...mergeContentItemSignals(entry.item, freshById),
                    id: freshById.id,
                    source: freshById.source ?? entry.item.source,
                    subtitle: freshById.subtitle ?? entry.item.subtitle,
                    title: freshById.title,
                    type: freshById.type,
                },
            };
        }

        const canonical = getCanonicalAlbumIdentityKey(entry.item);
        if (!canonical) {
            return entry;
        }

        const fresh = freshByCanonical.get(canonical);
        if (!fresh) {
            return entry;
        }

        return pickRecentAlbumEntry(entry, entry, fresh);
    });

    return dedupeRecentContentItemsByAlbumIdentity(reconciled);
};

export const filterItemsExcludingAlbumCanonicalKeys = <T extends AndroidRecentContentSourceItem>(
    items: T[],
    excludedCanonicalKeys: Set<string>,
): T[] =>
    items.filter((item) => {
        const canonical = getCanonicalAlbumIdentityKey(item);
        return !canonical || !excludedCanonicalKeys.has(canonical);
    });

export const dedupeItemsByAlbumCanonicalIdentity = <T extends AndroidRecentContentSourceItem>(
    items: T[],
): T[] => {
    const seenCanonical = new Set<string>();
    const deduped: T[] = [];

    for (const item of items) {
        const canonical = getCanonicalAlbumIdentityKey(item);
        if (canonical) {
            if (seenCanonical.has(canonical)) {
                continue;
            }
            seenCanonical.add(canonical);
        }
        deduped.push(item);
    }

    return deduped;
};

export const collectAlbumCanonicalKeys = (items: AndroidRecentContentSourceItem[]) => {
    const keys = new Set<string>();
    for (const item of items) {
        const canonical = getCanonicalAlbumIdentityKey(item);
        if (canonical) {
            keys.add(canonical);
        }
    }
    return keys;
};

const recentItemsEqual = (
    left: AndroidRecentContentItem[],
    right: AndroidRecentContentItem[],
) => {
    if (left.length !== right.length) {
        return false;
    }

    for (let index = 0; index < left.length; index += 1) {
        if (
            left[index].key !== right[index].key ||
            left[index].selectedAt !== right[index].selectedAt
        ) {
            return false;
        }
    }

    return true;
};

export const reconcileRecentContentItemsIfChanged = (
    items: AndroidRecentContentItem[],
    freshAlbumItems: AndroidRecentContentSourceItem[],
) => {
    const next = reconcileRecentContentItems(items, freshAlbumItems);
    return recentItemsEqual(items, next) ? items : next;
};

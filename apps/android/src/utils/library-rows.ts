import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidLibraryRelevantState } from '../services/library-content';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { type LibraryDisplayItem } from '../types/library-display';
import {
    EMPTY_LIBRARY_FULL_COLLECTIONS,
    LIBRARY_FILTERS,
    type LibraryFilter,
    type LibraryFullCollectionsState,
    type LibraryScope,
    type LibrarySort,
} from '../types/library-tab';
import { type LibraryMediaType } from '../types/library-display';
import { mergeContentItemSignals } from './content-item';
import { getLibraryMediaType, toLibraryDisplayItem } from './library-display';

export const putLibraryDisplayItem = (
    itemsByKey: Map<string, LibraryDisplayItem>,
    item: AndroidRecentContentSourceItem,
    selectedAt = 0,
) => {
    const displayItem = toLibraryDisplayItem(item, selectedAt);

    if (!displayItem) {
        return;
    }

    const existing = itemsByKey.get(displayItem.key);
    if (!existing) {
        itemsByKey.set(displayItem.key, displayItem);
        return;
    }

    itemsByKey.set(displayItem.key, {
        ...existing,
        item: mergeContentItemSignals(existing.item, displayItem.item),
        selectedAt: Math.max(existing.selectedAt, displayItem.selectedAt),
    });
};

export const getRelevantLibraryItems = (
    libraryRelevantState: AndroidLibraryRelevantState,
): LibraryDisplayItem[] => {
    if (libraryRelevantState.status !== 'loaded') {
        return [];
    }

    const itemsByKey = new Map<string, LibraryDisplayItem>();

    libraryRelevantState.items.forEach((item) => {
        putLibraryDisplayItem(itemsByKey, item);
    });

    return [...itemsByKey.values()];
};

export const getAllLibraryItems = (
    homeContentState: AndroidHomeContentState,
    fullCollections: LibraryFullCollectionsState = EMPTY_LIBRARY_FULL_COLLECTIONS,
): LibraryDisplayItem[] => {
    if (homeContentState.status !== 'loaded') {
        return [];
    }

    const itemsByKey = new Map<string, LibraryDisplayItem>();
    const hasFullAlbums = fullCollections.albums.status === 'loaded';
    const hasFullArtists = fullCollections.artists.status === 'loaded';

    homeContentState.content.sections.forEach((section) => {
        section.items.forEach((item) => {
            const mediaType = getLibraryMediaType(item);

            if (
                (mediaType === 'albums' && hasFullAlbums) ||
                (mediaType === 'artists' && hasFullArtists)
            ) {
                return;
            }
            putLibraryDisplayItem(itemsByKey, item);
        });
    });

    if (fullCollections.albums.status === 'loaded') {
        fullCollections.albums.items.forEach((item) => putLibraryDisplayItem(itemsByKey, item));
    }
    if (fullCollections.artists.status === 'loaded') {
        fullCollections.artists.items.forEach((item) => putLibraryDisplayItem(itemsByKey, item));
    }

    return [...itemsByKey.values()];
};

export const getLibraryBaseItems = (
    scope: LibraryScope,
    homeContentState: AndroidHomeContentState,
    libraryRelevantState: AndroidLibraryRelevantState,
    fullCollections: LibraryFullCollectionsState = EMPTY_LIBRARY_FULL_COLLECTIONS,
): LibraryDisplayItem[] => {
    if (scope === 'relevant') {
        return getRelevantLibraryItems(libraryRelevantState);
    }

    return getAllLibraryItems(homeContentState, fullCollections);
};

export const getAvailableLibraryFilters = (
    baseItems: LibraryDisplayItem[],
    recentItems: AndroidRecentContentItem[],
    fullCollections: LibraryFullCollectionsState = EMPTY_LIBRARY_FULL_COLLECTIONS,
) => {
    const mediaTypes = new Set<LibraryMediaType>();

    baseItems.forEach((item) => mediaTypes.add(item.mediaType));
    if (fullCollections.albums.status === 'loading') {
        mediaTypes.add('albums');
    }
    if (fullCollections.artists.status === 'loading') {
        mediaTypes.add('artists');
    }
    recentItems.forEach((recentItem) => {
        const mediaType = getLibraryMediaType(recentItem.item);

        if (mediaType) {
            mediaTypes.add(mediaType);
        }
    });

    return LIBRARY_FILTERS.filter(
        (filter) => filter.id === 'all' || (filter.mediaType && mediaTypes.has(filter.mediaType)),
    );
};

export const getLibraryRows = (
    baseItems: LibraryDisplayItem[],
    recentItems: AndroidRecentContentItem[],
    activeFilter: LibraryFilter,
    query: string,
    sort: LibrarySort = 'recents',
) => {
    const recentItemsByKey = new Map(recentItems.map((item) => [item.key, item]));
    const baseKeys = new Set(baseItems.map((item) => item.key));
    const libraryItems = baseItems.map((item) => ({
        ...item,
        selectedAt: recentItemsByKey.get(item.key)?.selectedAt ?? 0,
    }));
    const orphanRecentItems = recentItems.flatMap((recentItem) => {
        if (baseKeys.has(recentItem.key)) {
            return [];
        }

        const displayItem = toLibraryDisplayItem(recentItem.item, recentItem.selectedAt);

        return displayItem ? [displayItem] : [];
    });
    const trimmedQuery = query.trim().toLowerCase();

    return [...libraryItems, ...orphanRecentItems]
        .filter((item) => activeFilter === 'all' || item.mediaType === activeFilter)
        .filter((item) => {
            if (!trimmedQuery) {
                return true;
            }

            return (
                item.item.title.toLowerCase().includes(trimmedQuery) ||
                (item.item.subtitle?.toLowerCase().includes(trimmedQuery) ?? false) ||
                (item.item.source?.title.toLowerCase().includes(trimmedQuery) ?? false)
            );
        })
        .sort((left, right) => {
            if (sort === 'name') {
                return left.item.title.localeCompare(right.item.title);
            }

            if (left.selectedAt !== right.selectedAt) {
                return right.selectedAt - left.selectedAt;
            }

            return left.item.title.localeCompare(right.item.title);
        });
};

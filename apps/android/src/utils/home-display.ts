import {
    type MobileHomeItem,
    type MobileHomeSection,
    MobileHomeItemType,
    MobileHomeSectionId,
    MobileSearchItemType,
} from '@samo/core/mobile';
import { buildAudiobookshelfArtworkUrl } from '@samo/core/mobile';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { type HomeDisplaySection, type HomeFilter } from '../types/home';
import { type ViewAllVariant } from '../types/view-all';
import { type LibraryMediaType } from '../types/library-display';
import { clamp } from './math';
import { mergeContentItemSignals } from './content-item';
import { getLibraryMediaType } from './library-display';

const HOME_FILTER_DEFINITIONS: Array<{ id: HomeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'music', label: 'Music' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'audiobooks', label: 'Audiobooks' },
    { id: 'radio', label: 'Radio' },
];

export const filterHomeDisplaySections = (
    sections: HomeDisplaySection[],
    filter: HomeFilter,
): HomeDisplaySection[] => {
    if (filter === 'all') {
        return sections;
    }

    const musicVariants: HomeDisplaySection['variant'][] = ['album', 'artist', 'playlist', 'wide'];
    const podcastVariants: HomeDisplaySection['variant'][] = ['podcast'];
    const audiobookVariants: HomeDisplaySection['variant'][] = ['book'];
    const radioVariants: HomeDisplaySection['variant'][] = ['radio'];
    const continuableVariants: HomeDisplaySection['variant'][] = ['continue'];

    // Recents is mixed-type — keep the section but drop any items that don't
    // belong in the active filter, so picking "Music" actually scrubs
    // podcasts/audiobooks/radio out of the Recently Played strip.
    const itemBelongsTo = (
        item: AndroidRecentContentSourceItem,
        bucket: HomeFilter,
    ): boolean => {
        const type = item.type;
        switch (bucket) {
            case 'all':
                return true;
            case 'music':
                return (
                    type === MobileHomeItemType.ALBUM ||
                    type === MobileHomeItemType.ARTIST ||
                    type === MobileHomeItemType.PLAYLIST ||
                    type === MobileSearchItemType.ALBUM ||
                    type === MobileSearchItemType.ARTIST ||
                    type === MobileSearchItemType.PLAYLIST ||
                    type === MobileSearchItemType.SONG
                );
            case 'podcasts':
                return (
                    type === MobileHomeItemType.PODCAST ||
                    type === MobileSearchItemType.PODCAST
                );
            case 'audiobooks':
                return (
                    type === MobileHomeItemType.AUDIOBOOK ||
                    type === MobileSearchItemType.AUDIOBOOK
                );
            case 'radio':
                return (
                    type === MobileHomeItemType.RADIO ||
                    type === MobileSearchItemType.RADIO
                );
        }
    };
    const filterRecentsItems = (section: HomeDisplaySection) => {
        if (section.variant !== 'recents') return section;
        const filtered = section.items.filter((item) => itemBelongsTo(item, filter));
        return { ...section, items: filtered };
    };
    const dropEmpty = (section: HomeDisplaySection) => section.items.length > 0;

    if (filter === 'music') {
        return sections
            .filter((s) => musicVariants.includes(s.variant) || s.variant === 'recents')
            .map(filterRecentsItems)
            .filter(dropEmpty);
    }

    if (filter === 'podcasts') {
        return sections
            .filter(
                (s) =>
                    podcastVariants.includes(s.variant) ||
                    continuableVariants.includes(s.variant) ||
                    s.variant === 'recents',
            )
            .map(filterRecentsItems)
            .filter(dropEmpty);
    }

    if (filter === 'audiobooks') {
        return sections
            .filter(
                (s) =>
                    audiobookVariants.includes(s.variant) ||
                    continuableVariants.includes(s.variant) ||
                    s.variant === 'recents',
            )
            .map(filterRecentsItems)
            .filter(dropEmpty);
    }

    if (filter === 'radio') {
        return sections
            .filter((s) => radioVariants.includes(s.variant) || s.variant === 'recents')
            .map(filterRecentsItems)
            .filter(dropEmpty);
    }

    return sections;
};

export const getAvailableHomeFilters = (sections: HomeDisplaySection[]) => {
    const variants = new Set(sections.map((s) => s.variant));
    const hasMusicContent =
        variants.has('album') || variants.has('artist') || variants.has('playlist');
    const hasPodcastContent = variants.has('podcast');
    const hasAudiobookContent = variants.has('book');
    const hasRadioContent = variants.has('radio');

    return HOME_FILTER_DEFINITIONS.filter((f) => {
        if (f.id === 'all') return true;
        if (f.id === 'music') return hasMusicContent;
        if (f.id === 'podcasts') return hasPodcastContent;
        if (f.id === 'audiobooks') return hasAudiobookContent;
        if (f.id === 'radio') return hasRadioContent;
        return false;
    });
};
export const getSectionsById = (
    homeContentState: AndroidHomeContentState,
    sectionIds: MobileHomeSectionId[],
) => {
    if (homeContentState.status !== 'loaded') {
        return [];
    }

    return sectionIds.flatMap((sectionId) => {
        const section = homeContentState.content.sections.find(
            (candidate) => candidate.id === sectionId,
        );
        return section ? [section] : [];
    });
};
export const resolveItemArtworkUrl = (
    item: AndroidRecentContentSourceItem,
    serverConnections: ServerAuthenticationResult[],
): string | undefined => {
    if (item.artworkUrl) return item.artworkUrl;
    const sourceId = item.source?.id;
    if (!sourceId) return undefined;
    const auth = serverConnections.find(
        (candidate) => getPersistedServerAuthKey(candidate) === sourceId,
    );
    if (!auth) return undefined;
    if (
        auth.type === ServerType.NAVIDROME ||
        auth.type === ServerType.SUBSONIC
    ) {
        const params = new URLSearchParams({
            c: 'Samo',
            f: 'json',
            id: item.id,
            size: '320',
            v: '1.13.0',
        });
        return `${auth.url}/rest/getCoverArt.view?${params.toString()}&${auth.credential}`;
    }
    if (auth.type === ServerType.AUDIOBOOKSHELF) {
        return buildAudiobookshelfArtworkUrl(auth, item.id, undefined);
    }
    return undefined;
};

/**
 * Apply resolveItemArtworkUrl across a list of items, returning each item
 * unchanged when it already had artwork. Used to backfill recents (which may
 * have been persisted before the entity-id fallback existed) without
 * mutating the persisted store.
 */
export const withResolvedArtwork = <T extends AndroidRecentContentSourceItem>(
    items: T[],
    serverConnections: ServerAuthenticationResult[],
): T[] => {
    return items.map((item) => {
        if (item.artworkUrl) return item;
        const resolved = resolveItemArtworkUrl(item, serverConnections);
        return resolved ? ({ ...item, artworkUrl: resolved } as T) : item;
    });
};
export const sortHomeItemsByRecents = <T extends AndroidRecentContentSourceItem>(
    items: T[],
    recentItems: AndroidRecentContentItem[],
): T[] => {
    const recentItemsByKey = new Map(recentItems.map((item) => [item.key, item]));

    return [...items].sort((left, right) => {
        const leftRecentAt = recentItemsByKey.get(getRecentContentItemKey(left))?.selectedAt ?? 0;
        const rightRecentAt = recentItemsByKey.get(getRecentContentItemKey(right))?.selectedAt ?? 0;

        if (leftRecentAt !== rightRecentAt) {
            return rightRecentAt - leftRecentAt;
        }

        return left.title.localeCompare(right.title);
    });
};

export const getUniqueHomeItems = (items: AndroidRecentContentSourceItem[]) => {
    const itemsByKey = new Map<string, AndroidRecentContentSourceItem>();

    items.forEach((item) => {
        const key = getRecentContentItemKey(item);
        const existing = itemsByKey.get(key);

        if (existing) {
            itemsByKey.set(key, mergeContentItemSignals(existing, item));
        } else {
            itemsByKey.set(key, item);
        }
    });

    return [...itemsByKey.values()];
};

export const getHomeItemsForSection = (
    sectionsById: Map<MobileHomeSectionId, MobileHomeSection>,
    sectionId: MobileHomeSectionId,
    recentItems: AndroidRecentContentItem[],
) => {
    return sortHomeItemsByRecents(sectionsById.get(sectionId)?.items ?? [], recentItems);
};
const RECENTLY_ADDED_ROW_LIMIT = 18;
const RECENTLY_PLAYED_ROW_LIMIT = 36;

export const getViewAllVariant = (
    variant: HomeDisplaySection['variant'],
): null | ViewAllVariant => {
    switch (variant) {
        case 'album':
            return 'album';
        case 'artist':
            return 'artist';
        case 'book':
            return 'audiobook';
        case 'playlist':
            return 'playlist';
        case 'podcast':
            return 'podcast';
        // Recents, the "Recently Added" hero, the radio grid, and the wide
        // "continue" row are deliberately ephemeral or live — no View All.
        case 'continue':
        case 'radio':
        case 'recents':
        case 'wide':
            return null;
    }
};
export const buildRecentlyAddedHeroRow = (
    sectionsById: Map<MobileHomeSectionId, MobileHomeSection>,
): MobileHomeItem[] => {
    const candidates: MobileHomeItem[] = [
        ...(sectionsById.get(MobileHomeSectionId.RECENTLY_ADDED)?.items ?? []),
        ...(sectionsById.get(MobileHomeSectionId.AUDIOBOOKS)?.items ?? []),
        ...(sectionsById.get(MobileHomeSectionId.PODCASTS)?.items ?? []),
    ];
    const seenKeys = new Set<string>();
    const deduped: MobileHomeItem[] = [];
    for (const item of candidates) {
        const key = getRecentContentItemKey(item);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        deduped.push(item);
    }
    deduped.sort((left, right) => {
        const leftAdded = left.addedAt ?? -Infinity;
        const rightAdded = right.addedAt ?? -Infinity;
        if (leftAdded === rightAdded) {
            return left.title.localeCompare(right.title);
        }
        return rightAdded - leftAdded;
    });
    return deduped.slice(0, RECENTLY_ADDED_ROW_LIMIT);
};

export const getContentItemProgress = (item: AndroidRecentContentSourceItem) => {
    const playback = item.playback;

    if (!playback?.durationSeconds || !playback.initialPositionSeconds) {
        return undefined;
    }

    const progress = playback.initialPositionSeconds / playback.durationSeconds;

    if (progress <= 0.02 || progress >= 0.96) {
        return undefined;
    }

    return clamp(progress, 0, 1);
};
export const getHomeDisplaySections = (
    sections: MobileHomeSection[],
    recentItems: AndroidRecentContentItem[],
    serverConnections: ServerAuthenticationResult[],
): HomeDisplaySection[] => {
    const displaySections: HomeDisplaySection[] = [];
    const sectionsById = new Map(sections.map((section) => [section.id, section]));
    // Look up fresh home items by recent-key so we can swap in current artwork URLs
    // for recents. Persisted recents can carry stale Audiobookshelf JWT tokens or
    // expired cover-art URLs; using the freshly-loaded equivalent fixes that.
    const freshItemsByKey = new Map<string, MobileHomeItem>();
    for (const section of sections) {
        for (const item of section.items) {
            const key = getRecentContentItemKey(item);
            const existing = freshItemsByKey.get(key);
            if (existing) {
                freshItemsByKey.set(key, mergeContentItemSignals(existing, item) as MobileHomeItem);
            } else {
                freshItemsByKey.set(key, item);
            }
        }
    }
    const recentDisplayItems = withResolvedArtwork(
        recentItems.flatMap((recentItem) => {
            if (!getLibraryMediaType(recentItem.item)) {
                return [];
            }
            const fresh = freshItemsByKey.get(recentItem.key);
            if (!fresh) {
                return [recentItem.item];
            }

            return [
                {
                    ...recentItem.item,
                    ...fresh,
                    artworkUrl: fresh.artworkUrl ?? recentItem.item.artworkUrl,
                    isHiRes: fresh.isHiRes ?? recentItem.item.isHiRes,
                    playback: fresh.playback ?? recentItem.item.playback,
                    qualityProfile: fresh.qualityProfile ?? recentItem.item.qualityProfile,
                },
            ];
        }),
        serverConnections,
    );
    const favoriteAlbumItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.FAVORITE_ALBUMS,
        recentItems,
    );
    const recentlyAddedAlbumItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.RECENTLY_ADDED,
        recentItems,
    );
    const albumItems = getUniqueHomeItems([...favoriteAlbumItems, ...recentlyAddedAlbumItems]);
    const favoriteArtistItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.FAVORITE_ARTISTS,
        recentItems,
    );
    const podcastItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.PODCASTS,
        recentItems,
    );
    const audiobookItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.AUDIOBOOKS,
        recentItems,
    );
    const playlistItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.PLAYLISTS,
        recentItems,
    );
    const sortedAllItems = sortHomeItemsByRecents(
        getUniqueHomeItems(sections.flatMap((section) => section.items)),
        recentItems,
    );
    const recentKeys = new Set(recentItems.map((item) => item.key));
    const discoverItems = sortedAllItems.filter(
        (item) =>
            !recentKeys.has(getRecentContentItemKey(item)) &&
            (item.type === MobileHomeItemType.ALBUM || item.type === MobileHomeItemType.PLAYLIST),
    );

    if (recentDisplayItems.length > 0) {
        displaySections.push({
            items: recentDisplayItems.slice(0, RECENTLY_PLAYED_ROW_LIMIT),
            key: 'recents',
            rowCount: 2,
            title: 'Recently Played',
            variant: 'recents',
        });
    }

    // Newest items each server has, interleaved across categories so albums,
    // audiobooks, and podcasts all get a turn. Keep it under Recently Played
    // because the user asked for listening history to lead Home.
    const recentlyAddedItems = buildRecentlyAddedHeroRow(sectionsById);
    if (recentlyAddedItems.length > 0) {
        displaySections.push({
            items: recentlyAddedItems,
            key: 'recently-added-to-server',
            title: 'Recently Added',
            variant: 'recents',
        });
    }

    if (albumItems.length > 0) {
        displaySections.push({
            items: albumItems,
            key: 'albums',
            title: 'Albums',
            variant: 'album',
        });
    }

    if (audiobookItems.length > 0) {
        displaySections.push({
            items: audiobookItems,
            key: MobileHomeSectionId.AUDIOBOOKS,
            title: 'Audiobooks',
            variant: 'book',
        });
    }

    if (podcastItems.length > 0) {
        displaySections.push({
            items: podcastItems,
            key: MobileHomeSectionId.PODCASTS,
            title: 'Podcasts',
            variant: 'podcast',
        });
    }

    if (favoriteArtistItems.length > 0) {
        displaySections.push({
            items: favoriteArtistItems.slice(0, 16),
            key: MobileHomeSectionId.FAVORITE_ARTISTS,
            title: 'Artists',
            variant: 'artist',
        });
    }

    if (playlistItems.length > 0) {
        displaySections.push({
            items: playlistItems.slice(0, 16),
            key: MobileHomeSectionId.PLAYLISTS,
            title: 'Playlists',
            variant: 'playlist',
        });
    }

    if (discoverItems.length >= 4) {
        displaySections.push({
            items: discoverItems.slice(0, 18),
            key: 'rediscover',
            title: 'Rediscover',
            variant: 'wide',
        });
    }

    return displaySections.filter((section) => section.items.length > 0);
};

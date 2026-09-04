import {
    type MobileHomeItem,
    type MobileHomeSection,
    MobileHomeItemType,
    MobileHomeSectionId,
    MobileSearchItemType,
    sortMobileHomeItemsByPlayCount,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
    isEligibleRecentlyPlayedSurfaceItem,
} from '../services/recent-content';
import { type HomeDisplaySection, type HomeFilter } from '../types/home';
import { type ViewAllVariant } from '../types/view-all';
import { type LibraryMediaType } from '../types/library-display';
import { getHomeLayoutHint } from '../services/home-layout-hint';
import { traceSync } from '../services/jank-trace';
import { reconcileHomeDisplaySections } from './home-display-reconcile';
import { clamp } from './math';
import { getContentItemKey, mergeContentItemSignals } from './content-item';
import { getLibraryMediaType } from './library-display';
import {
    collectAlbumCanonicalKeys,
    dedupeItemsByAlbumCanonicalIdentity,
    filterItemsExcludingAlbumCanonicalKeys,
    getCanonicalAlbumIdentityKey,
} from './recent-content-dedupe';
import {
    getArtworkResolutionGeneration,
    resolveSamoItemArtworkSourceForDisplay,
} from './samo-artwork-url';

const sortHomeItemsByLastPlayed = (items: MobileHomeItem[]): MobileHomeItem[] =>
    [...items].sort((left, right) => {
        const leftPlayed = left.lastPlayedAt ?? 0;
        const rightPlayed = right.lastPlayedAt ?? 0;
        if (rightPlayed !== leftPlayed) {
            return rightPlayed - leftPlayed;
        }
        return left.title.localeCompare(right.title);
    });

/** Drop repeats within a single shelf, keeping first-seen order, keyed exactly
 *  like the FlashList `key=` (source:type:id) so no two rendered tiles collide. */
const dedupeByContentKey = <T extends { id: string; source?: { id: string }; type: string }>(
    items: T[],
): T[] => {
    const seen = new Set<string>();
    const unique: T[] = [];
    for (const item of items) {
        const key = getContentItemKey(item);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(item);
    }
    return unique;
};

const HOME_FILTER_DEFINITIONS: Array<{ id: HomeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'music', label: 'Music' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'audiobooks', label: 'Audiobooks' },
    { id: 'radio', label: 'Radio' },
];

// Recently Played is hidden entirely until there are at least this many
// (deduped) items — no partial shelf and no header. Enforced on the main Home
// shelf and mirrored in every filtered tab.
const RECENTLY_PLAYED_MIN_ITEMS = 4;

export const filterHomeDisplaySections = (
    sections: HomeDisplaySection[],
    filter: HomeFilter,
): HomeDisplaySection[] => {
    if (filter === 'all') {
        return sections;
    }

    const musicVariants: HomeDisplaySection['variant'][] = [
        'album',
        'artist',
        'explo',
        'playlist',
        'wide',
    ];
    const podcastVariants: HomeDisplaySection['variant'][] = ['podcast', 'podcast-feed'];
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
                    type === MobileHomeItemType.PLAYLIST ||
                    type === MobileSearchItemType.ALBUM ||
                    type === MobileSearchItemType.PLAYLIST ||
                    type === MobileSearchItemType.SONG
                );
            case 'podcasts':
                return (
                    type === MobileHomeItemType.PODCAST ||
                    type === MobileHomeItemType.PODCAST_EPISODE ||
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
        // The "Recently Played" shelf (key 'recents') is hidden entirely below
        // the minimum — never a partial shelf. Other 'recents'-variant shelves
        // (e.g. "Recently Added") keep their own behavior.
        if (section.key === 'recents' && filtered.length < RECENTLY_PLAYED_MIN_ITEMS) {
            return { ...section, items: [] };
        }
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
        variants.has('album') ||
        variants.has('artist') ||
        variants.has('playlist') ||
        variants.has('explo');
    const hasPodcastContent = variants.has('podcast') || variants.has('podcast-feed');
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
    serverConnection: ServerAuthenticationResult | null,
): string | undefined => {
    if (item.artworkUrl) return item.artworkUrl;
    const sourceId = item.source?.id;
    if (!sourceId) return undefined;
    const auth = findServerAuthenticationForSource(serverConnection, { id: sourceId });
    if (!auth) return undefined;
    if (auth) {
        const resolved = resolveSamoItemArtworkSourceForDisplay(item, serverConnection);
        return typeof resolved === 'string' ? resolved : resolved?.uri;
    }
    return undefined;
};

/**
 * Per-source-item memo of the backfill below, valid until the credentials
 * behind the URLs rotate. Keyed on the SOURCE item, which
 * `reconcileHomeContent` already keeps stable across derives, so a re-derive
 * of unchanged content returns the identical objects.
 *
 * Weak, so an item that falls out of Home is collected with its entry.
 */
const resolvedArtworkItems = new WeakMap<
    object,
    { generation: number; resolved: AndroidRecentContentSourceItem }
>();

/**
 * Backfill `artworkUrl` for items that have no artwork id to render from —
 * recents persisted before the id fallback existed — without mutating the
 * persisted store.
 *
 * An item that DOES carry `artworkImageId` is returned untouched, and that is
 * load-bearing rather than an optimization. The resolved URL embeds the
 * current `stream_token`, which samo rotates (~25 min, and on every re-auth),
 * so stamping it onto every item made every item a NEW object on every
 * derive — differing from its predecessor in exactly one field, the token.
 * That was the entire reason Home's derive was expensive: hundreds of
 * allocations, then a deep value-compare of every item against its
 * predecessor (`reconcileHomeDisplaySections`, which has to canonicalize the
 * token away) purely to hand the old object back. Nothing consumed the
 * backfilled URL either — every display path (`ArtworkImage`) and the prefetch
 * walker resolve from `artworkImageId` first, which is stable.
 */
export const withResolvedArtwork = <T extends AndroidRecentContentSourceItem>(
    items: T[],
    serverConnection: ServerAuthenticationResult | null,
): T[] => {
    const generation = getArtworkResolutionGeneration();
    let changed = false;
    const resolvedItems = items.map((item) => {
        if (item.artworkImageId) {
            return item;
        }
        const cached = resolvedArtworkItems.get(item);
        if (cached && cached.generation === generation) {
            changed ||= cached.resolved !== item;
            return cached.resolved as T;
        }

        const imageSource = resolveSamoItemArtworkSourceForDisplay(item, serverConnection);
        const artworkUrl =
            typeof imageSource === 'string' ? imageSource : imageSource?.uri;
        const resolved =
            !artworkUrl || artworkUrl === item.artworkUrl
                ? item
                : ({ ...item, artworkUrl } as T);

        resolvedArtworkItems.set(item, { generation, resolved });
        changed ||= resolved !== item;
        return resolved;
    });

    // Nothing was backfilled — hand back the SAME array so callers that compare
    // by identity (and the memoized sections above them) see no change at all.
    return changed ? resolvedItems : items;
};

export const getArtworkImageSourceForItem = (
    item: AndroidRecentContentSourceItem,
    serverConnection: ServerAuthenticationResult | null,
) => {
    return resolveSamoItemArtworkSourceForDisplay(item, serverConnection);
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

/** Dedupe while keeping the first occurrence's position (server sort order). */
export const dedupeHomeItemsPreservingOrder = <T extends AndroidRecentContentSourceItem>(
    items: T[],
): T[] => {
    const mergedByKey = new Map<string, T>();

    for (const item of items) {
        const key = getRecentContentItemKey(item);
        const existing = mergedByKey.get(key);
        mergedByKey.set(
            key,
            existing ? (mergeContentItemSignals(existing, item) as T) : item,
        );
    }

    const emitted = new Set<string>();
    const output: T[] = [];

    for (const item of items) {
        const key = getRecentContentItemKey(item);
        if (emitted.has(key)) {
            continue;
        }
        emitted.add(key);
        output.push(mergedByKey.get(key)!);
    }

    return output;
};

const dedupeRecentDisplayItems = <T extends AndroidRecentContentSourceItem>(items: T[]): T[] => {
    const seenKeys = new Set<string>();
    const seenAlbumCanonical = new Set<string>();
    const deduped: T[] = [];

    for (const item of items) {
        const key = getRecentContentItemKey(item);
        if (seenKeys.has(key)) {
            continue;
        }

        const canonical = getCanonicalAlbumIdentityKey(item);
        if (canonical && seenAlbumCanonical.has(canonical)) {
            continue;
        }

        seenKeys.add(key);
        if (canonical) {
            seenAlbumCanonical.add(canonical);
        }
        deduped.push(item);
    }

    return deduped;
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
        case 'podcast-feed':
            return 'podcast-feed';
        // Explo is a single featured card (one playlist) — nothing to view all.
        case 'explo':
        case 'radio':
        case 'recents':
        case 'wide':
            return null;
    }
};
export const buildRecentlyAddedHeroRow = (
    sectionsById: Map<MobileHomeSectionId, MobileHomeSection>,
    excludedAlbumCanonicalKeys: Set<string> = new Set(),
): MobileHomeItem[] => {
    const candidates: MobileHomeItem[] = [
        ...(sectionsById.get(MobileHomeSectionId.RECENTLY_ADDED)?.items ?? []),
    ];
    const seenKeys = new Set<string>();
    const seenAlbumCanonical = new Set(excludedAlbumCanonicalKeys);
    const deduped: MobileHomeItem[] = [];
    for (const item of candidates) {
        const key = getRecentContentItemKey(item);
        if (seenKeys.has(key)) continue;
        const canonical = getCanonicalAlbumIdentityKey(item);
        if (canonical && seenAlbumCanonical.has(canonical)) continue;
        seenKeys.add(key);
        if (canonical) {
            seenAlbumCanonical.add(canonical);
        }
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
    const homeItem = 'progressSeconds' in item ? item : undefined;
    if (homeItem?.completionState === 'completed') {
        return 1;
    }

    const durationSeconds = item.playback?.durationSeconds ?? homeItem?.durationSeconds;
    const positionSeconds =
        item.playback?.initialPositionSeconds ?? homeItem?.progressSeconds ?? 0;

    if (!durationSeconds || positionSeconds <= 0) {
        return undefined;
    }

    const progress = positionSeconds / durationSeconds;

    if (progress <= 0.02 || progress >= 0.96) {
        return undefined;
    }

    return clamp(progress, 0, 1);
};
// A per-launch seed so Home surfaces a different slice of the library on each
// cold open — alive, not static — while staying stable within a session so
// nothing reshuffles under your thumb. Chronological rows (Recently Played /
// Added, Podcast Feed) are left untouched; only the "your library" shelves
// rotate, so the leading covers vary without changing what a section means.
let homeFreshnessSeed: null | number = null;
export const rotateForFreshness = <T>(items: T[], salt: number): T[] => {
    if (items.length < 5) {
        return items;
    }
    if (homeFreshnessSeed === null) {
        homeFreshnessSeed = Math.floor(Math.random() * 9973);
    }
    const offset = (homeFreshnessSeed + salt) % items.length;
    return offset === 0 ? items : [...items.slice(offset), ...items.slice(0, offset)];
};

export const getHomeDisplaySections = (
    sections: MobileHomeSection[],
    recentItems: AndroidRecentContentItem[],
    serverConnection: ServerAuthenticationResult | null,
    previous?: HomeDisplaySection[],
): HomeDisplaySection[] => {
    const displaySections: HomeDisplaySection[] = [];
    const resolvedSections = traceSync('home.resolveArtwork', () =>
        sections.map((section) => ({
            ...section,
            items: withResolvedArtwork(section.items, serverConnection),
        })),
    );
    const sectionsById = new Map(resolvedSections.map((section) => [section.id, section]));
    // Look up fresh home items by recent-key so we can swap in current artwork URLs
    // for recents. Persisted recents can carry stale or expired cover-art URLs;
    // using the freshly-loaded equivalent fixes that.
    const freshItemsByKey = new Map<string, MobileHomeItem>();
    for (const section of resolvedSections) {
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
    const recentDisplayItems = traceSync('home.recents', () => withResolvedArtwork(
        dedupeRecentDisplayItems(
            recentItems.flatMap((recentItem) => {
                if (
                    !isEligibleRecentlyPlayedSurfaceItem(recentItem.item, {
                        directSong: recentItem.directSong,
                    }) ||
                    !getLibraryMediaType(recentItem.item)
                ) {
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
        ),
        serverConnection,
    ));
    const seenAlbumCanonicalKeys = collectAlbumCanonicalKeys(recentDisplayItems);
    const recentlyAddedItems = buildRecentlyAddedHeroRow(sectionsById, seenAlbumCanonicalKeys);
    for (const item of recentlyAddedItems) {
        const canonical = getCanonicalAlbumIdentityKey(item);
        if (canonical) {
            seenAlbumCanonicalKeys.add(canonical);
        }
    }
    const albumItems = sortMobileHomeItemsByPlayCount(
        filterItemsExcludingAlbumCanonicalKeys(
            dedupeItemsByAlbumCanonicalIdentity(
                dedupeHomeItemsPreservingOrder(
                    (sectionsById.get(MobileHomeSectionId.FAVORITE_ALBUMS)?.items ?? []).filter(
                        (item) => item.type === MobileHomeItemType.ALBUM,
                    ),
                ),
            ),
            seenAlbumCanonicalKeys,
        ),
    );
    const podcastFeedItems = dedupeHomeItemsPreservingOrder(
        (sectionsById.get(MobileHomeSectionId.PODCAST_FEED)?.items ?? [])
            .filter((item) => item.type === MobileHomeItemType.PODCAST_EPISODE)
            .sort((left, right) => (right.addedAt ?? 0) - (left.addedAt ?? 0)),
    );
    const artistItems = dedupeHomeItemsPreservingOrder(
        (sectionsById.get(MobileHomeSectionId.FAVORITE_ARTISTS)?.items ?? []).filter(
            (item) => item.type === MobileHomeItemType.ARTIST,
        ),
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
    const playlistItems = sortHomeItemsByLastPlayed(
        getHomeItemsForSection(sectionsById, MobileHomeSectionId.PLAYLISTS, recentItems),
    );
    // Server-managed "system" playlist — at most one item, so nothing to
    // dedupe/sort beyond what the core layer already produced.
    const exploItems = sectionsById.get(MobileHomeSectionId.EXPLO)?.items ?? [];
    const discoverItems = filterItemsExcludingAlbumCanonicalKeys(
        sectionsById.get(MobileHomeSectionId.DISCOVER)?.items ?? [],
        seenAlbumCanonicalKeys,
    );

    // Reserve sized skeleton slots for the network-gated shelves so their late
    // arrival fills in place instead of inserting mid-page (the Podcast-Feed
    // "loads in a beat later and shoves everything down" flash). Signal:
    // persisted hint primary (last launch's counts), mirror-derived fallback on
    // a first-ever launch (has podcasts → a feed is coming). Once a live load
    // resolves, the hint is rewritten — a genuinely-empty feed writes 0 and the
    // reservation clears on the next render.
    const layoutHint = getHomeLayoutHint();
    const reservePodcastFeed =
        podcastFeedItems.length === 0 &&
        (layoutHint ? layoutHint.podcastFeed > 0 : podcastItems.length > 0);
    // Rediscover sits at the bottom (low-harm insert), so only the precise hint
    // reserves it — never the broad "has albums" fallback that could leave a
    // stray bottom skeleton on a first launch with no Discover content.
    const reserveRediscover = discoverItems.length < 4 && (layoutHint?.rediscover ?? 0) > 0;

    // Only present while offline (see use-visible-home-content), and first when
    // it is: with no network, "what is already on this phone" is the only thing
    // on Home that can actually be played, so it leads. Mixed-type, so it uses
    // the recents variant and picks up the filter pills' per-item scrubbing for
    // free.
    const downloadedItems = sectionsById.get(MobileHomeSectionId.DOWNLOADED)?.items ?? [];
    if (downloadedItems.length > 0) {
        displaySections.push({
            items: downloadedItems,
            key: MobileHomeSectionId.DOWNLOADED,
            title: 'Downloaded',
            variant: 'recents',
        });
    }

    if (recentDisplayItems.length >= RECENTLY_PLAYED_MIN_ITEMS) {
        displaySections.push({
            items: recentDisplayItems.slice(0, RECENTLY_PLAYED_ROW_LIMIT),
            key: 'recents',
            rowCount: 2,
            title: '',
            variant: 'recents',
        });
    }

    if (podcastFeedItems.length > 0) {
        displaySections.push({
            items: podcastFeedItems.slice(0, 24),
            key: 'podcast-feed',
            title: 'Podcast Feed',
            variant: 'podcast-feed',
        });
    } else if (reservePodcastFeed) {
        displaySections.push({
            items: [],
            key: 'podcast-feed',
            pending: true,
            skeletonCount: 5,
            title: 'Podcast Feed',
            variant: 'podcast-feed',
        });
    }

    // Newest items each server has, interleaved across categories so albums,
    // audiobooks, and podcasts all get a turn. Keep it under Recently Played
    // because the user asked for listening history to lead Home.
    if (recentlyAddedItems.length > 0) {
        displaySections.push({
            items: recentlyAddedItems,
            key: 'recently-added-to-server',
            title: 'Recently Added',
            variant: 'recents',
        });
    }

    // Featured single-card row for the server-managed Explo drop playlist.
    // Deliberately sits high (right under Recently Added) since it's fresh,
    // curated content — not rotated for freshness like the library shelves
    // below, since there's only ever the one card.
    if (exploItems.length > 0) {
        displaySections.push({
            ignoresHiddenItems: true,
            items: exploItems,
            key: MobileHomeSectionId.EXPLO,
            title: 'New from Explore',
            variant: 'explo',
        });
    }

    if (albumItems.length > 0) {
        displaySections.push({
            items: rotateForFreshness(albumItems, 1),
            key: 'albums',
            title: 'Albums',
            variant: 'album',
        });
    }

    if (audiobookItems.length > 0) {
        displaySections.push({
            items: rotateForFreshness(audiobookItems, 2),
            key: MobileHomeSectionId.AUDIOBOOKS,
            title: 'Audiobooks',
            variant: 'book',
        });
    }

    if (podcastItems.length > 0) {
        displaySections.push({
            items: rotateForFreshness(podcastItems, 3),
            key: MobileHomeSectionId.PODCASTS,
            title: 'Podcasts',
            variant: 'podcast',
        });
    }

    if (artistItems.length > 0) {
        displaySections.push({
            items: rotateForFreshness(artistItems, 4).slice(0, 16),
            key: MobileHomeSectionId.FAVORITE_ARTISTS,
            title: 'Artists',
            variant: 'artist',
        });
    }

    // The Explore queue already has its own featured card above — drop it from
    // the generic shelf so it doesn't appear on Home twice. (It stays in the
    // Library playlist list, where completeness beats curation.)
    const exploPlaylistIds = new Set(exploItems.map((item) => item.id));
    const shelfPlaylistItems = playlistItems.filter((item) => !exploPlaylistIds.has(item.id));
    if (shelfPlaylistItems.length > 0) {
        displaySections.push({
            items: rotateForFreshness(shelfPlaylistItems, 5).slice(0, 16),
            key: MobileHomeSectionId.PLAYLISTS,
            title: 'Playlists',
            variant: 'playlist',
        });
    }

    if (discoverItems.length >= 4) {
        displaySections.push({
            items: rotateForFreshness(discoverItems, 6).slice(0, 18),
            key: 'rediscover',
            title: 'Rediscover',
            variant: 'wide',
        });
    } else if (reserveRediscover) {
        displaySections.push({
            items: [],
            key: 'rediscover',
            pending: true,
            skeletonCount: 3,
            title: 'Rediscover',
            variant: 'wide',
        });
    }

    // Keep pending placeholders (which carry no items) alongside populated shelves.
    // Dedupe each shelf by the SAME key the list renderer uses for `key=` — the
    // same album can legitimately fall into more than one pool (e.g. recently
    // played AND recently added), and a repeat within one shelf is React's
    // "two children with the same key" warning, which duplicates/drops tiles.
    const result = displaySections
        .map((section) =>
            section.items.length > 0
                ? { ...section, items: dedupeByContentKey(section.items) }
                : section,
        )
        .filter((section) => section.items.length > 0 || section.pending);
    return traceSync('home.reconcileSections', () =>
        reconcileHomeDisplaySections(previous, result),
    );
};

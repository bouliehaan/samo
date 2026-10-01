import { type MobileHomeItem, MobileHomeItemType } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidRecentContentItem } from '../services/recent-content';
import { type HomeDisplaySection } from '../types/home';
import { type MediaTypeCollectionKey } from '../types/library-tab';
import { getContentItemKey } from './content-item';
import { isPodcastEpisodeHomeItem } from './context-menu-infer';
import { getContentItemProgress, getUniqueHomeItems, withResolvedArtwork } from './home-display';
import { getLibraryMediaType } from './library-display';

/**
 * What the Podcasts and Audiobooks tabs are made of, on every surface that
 * shows them. The phone and the TV draw these differently; they must never
 * disagree about what is in them.
 */

const SHELF_ITEM_LIMIT = 12;

/**
 * The full Shows/Books catalog for the tab's grid. The mirror collection leads
 * so it sets the order; the Home shelf items ride along behind it to cover the
 * window before the read lands (and offline, where they're all there is). For
 * podcasts: only PODCAST-type items (not episodes) so the grid is purely a
 * show browser — episodes appear in the shelves above only.
 */
export const buildMediaTypeGridItems = (
    mediaType: MediaTypeCollectionKey,
    collectionItems: MobileHomeItem[],
    homeSections: HomeDisplaySection[],
) =>
    getUniqueHomeItems(
        [
            ...collectionItems,
            ...homeSections.filter((section) => !section.pending).flatMap((section) => section.items),
        ].filter((item) => {
            if (mediaType === 'podcasts') {
                return item.type === MobileHomeItemType.PODCAST;
            }
            return getLibraryMediaType(item) === mediaType;
        }),
    );

/**
 * The shelves above the grid: Continue Listening, then (podcasts) the
 * chronological New Episodes feed, then Recently Played.
 */
export const buildMediaTypeShelves = ({
    gridItems,
    homeSections,
    mediaType,
    recentItems,
    serverAudiobooks,
    serverConnection,
}: {
    gridItems: ReturnType<typeof buildMediaTypeGridItems>;
    homeSections: HomeDisplaySection[];
    mediaType: MediaTypeCollectionKey;
    recentItems: AndroidRecentContentItem[];
    /** The server's audiobooks listing, which carries the progress the mirror
     *  does not store. Only read for audiobooks. */
    serverAudiobooks: MobileHomeItem[];
    serverConnection: ServerAuthenticationResult | null;
}): HomeDisplaySection[] => {
    const shelfList: HomeDisplaySection[] = [];
    const gridItemsByKey = new Map(gridItems.map((item) => [getContentItemKey(item), item]));

    if (mediaType === 'podcasts') {
        const feedItems =
            homeSections.find((section) => section.key === 'podcast-feed' && !section.pending)
                ?.items ?? [];
        // Unfinished EPISODES — recents first (freshly resolved artwork),
        // then anything in-progress from the feed window.
        const continueItems = getUniqueHomeItems(
            [
                ...withResolvedArtwork(
                    recentItems.map((recent) => recent.item).filter(isPodcastEpisodeHomeItem),
                    serverConnection,
                ),
                ...feedItems,
            ].filter((item) => getContentItemProgress(item) !== undefined),
        ).slice(0, SHELF_ITEM_LIMIT);
        if (continueItems.length > 0) {
            shelfList.push({
                items: continueItems,
                key: 'podcasts-tab-continue',
                title: 'Continue Listening',
                variant: 'continue',
            });
        }
        if (feedItems.length > 0) {
            shelfList.push({
                items: feedItems,
                key: 'podcasts-tab-new-episodes',
                title: 'New Episodes',
                variant: 'podcast-feed',
            });
        }
        // SHOWS the user has recently listened to, in recency order. A played
        // EPISODE counts for its show too (containerId → show), so listening
        // from New Episodes lands the show down here.
        const showsById = new Map(gridItems.map((item) => [item.id, item]));
        const seenShowIds = new Set<string>();
        const recentShows: typeof gridItems = [];
        for (const recent of recentItems) {
            const showId =
                recent.item.type === MobileHomeItemType.PODCAST
                    ? recent.item.id
                    : isPodcastEpisodeHomeItem(recent.item)
                      ? recent.item.containerId
                      : undefined;
            if (!showId || seenShowIds.has(showId)) {
                continue;
            }
            seenShowIds.add(showId);
            const show = showsById.get(showId);
            if (show) {
                recentShows.push(show);
            }
            if (recentShows.length >= SHELF_ITEM_LIMIT) {
                break;
            }
        }
        if (recentShows.length > 0) {
            shelfList.push({
                items: recentShows,
                key: 'podcasts-tab-recently-played',
                title: 'Recently Played',
                variant: 'podcast',
            });
        }
        return shelfList;
    }

    // Audiobooks: unfinished books up top. Progress comes from the SERVER's
    // audiobooks listing (the mirror stores none) — graft it onto the
    // mirror-derived grid items by id.
    const serverProgressById = new Map(serverAudiobooks.map((item) => [item.id, item]));
    const continueBooks = gridItems
        .map((item) => {
            const serverItem = serverProgressById.get(item.id);
            return serverItem
                ? {
                      ...item,
                      completionState: serverItem.completionState,
                      durationSeconds:
                          ('durationSeconds' in item ? item.durationSeconds : undefined) ??
                          serverItem.durationSeconds,
                      progressSeconds: serverItem.progressSeconds,
                  }
                : item;
        })
        .filter((item) => getContentItemProgress(item) !== undefined)
        .slice(0, SHELF_ITEM_LIMIT);
    if (continueBooks.length > 0) {
        shelfList.push({
            items: continueBooks,
            key: 'audiobooks-tab-continue',
            title: 'Continue Listening',
            variant: 'continue',
        });
    }
    const recentBooks = recentItems
        .filter((recent) => recent.item.type === MobileHomeItemType.AUDIOBOOK)
        .map((recent) => gridItemsByKey.get(getContentItemKey(recent.item)))
        .filter((item): item is NonNullable<typeof item> => item != null)
        .slice(0, SHELF_ITEM_LIMIT);
    if (recentBooks.length > 0) {
        shelfList.push({
            items: recentBooks,
            key: 'audiobooks-tab-recently-played',
            title: 'Recently Played',
            variant: 'book',
        });
    }
    return shelfList;
};

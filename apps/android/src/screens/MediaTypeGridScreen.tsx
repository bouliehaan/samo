import { type MobileHomeItem, MobileHomeItemType } from '@samo/core/mobile';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LibrarySortMenu } from '../components/LibrarySortMenu';
import { useSearchPull } from '../components/search-pull/useSearchPull';
import { SkeletonTileGrid } from '../components/Skeleton';
import {
    handleSelectMediaItem,
    prefetchMediaDetailCache,
} from '../handlers/media-detail-handlers';
import { useTransitioningMount } from '../hooks/use-transitioning-mount';
import { useVisibleHomeContentState } from '../hooks/use-visible-home-content';
import { useVisibleRecentItems } from '../hooks/use-visible-recent-items';
import { triggerImpact } from '../services/haptics';
import { startMediaTypeCollectionLoad } from '../services/library-flow';
import { useServerAudiobookProgress } from '../services/server-progress';
import { useAppNavigationSelector } from '../state/app-navigation';
import { useAuthSessionSelector } from '../state/auth-session';
import { useNetworkSelector } from '../state/network-state';
import { PAGE_TOP_INSET } from '../theme/layout';
import { styles } from '../theme/styles';
import { type HomeDisplaySection } from '../types/home';
import {
    LIBRARY_SORTS,
    type LibrarySort,
    type MediaTypeCollectionKey,
} from '../types/library-tab';
import { getContentItemKey } from '../utils/content-item';
import { isPodcastEpisodeHomeItem } from '../utils/context-menu-infer';
import {
    getContentItemProgress,
    getHomeDisplaySections,
    getUniqueHomeItems,
    withResolvedArtwork,
} from '../utils/home-display';
import { getLibraryMediaType } from '../utils/library-display';
import { EmptyServerBackedScreen } from './EmptyServerBackedScreen';
import { HomeDisplayRow } from './home/HomeDisplayRow';
import { HomeFilterGrid } from './home/HomeFilterGrid';

const SHELF_ITEM_LIMIT = 12;

/** Stable empty reference — the collection selector runs on every store read,
 *  so it must never hand back a fresh array. */
const NO_COLLECTION_ITEMS: MobileHomeItem[] = [];

/**
 * A whole tab dedicated to one long-form media type — the Podcasts and
 * Audiobooks navbar destinations. Not just a wall of covers: hero shelves sit
 * on top (Continue Listening for unfinished episodes/books, the chronological
 * New Episodes feed for podcasts, Recently Played), then the full Shows/Books
 * grid. Everything reuses the Home shelf + grid pipeline, so tiles, progress
 * bars, long-press menus and prefetch behave identically to Home.
 */
export const MediaTypeGridScreen = memo(function MediaTypeGridScreen({
    mediaType,
}: {
    mediaType: MediaTypeCollectionKey;
}) {
    const homeContentState = useVisibleHomeContentState();
    const recentItems = useVisibleRecentItems();
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isTransitioning = useTransitioningMount();

    // THE catalog for this tab: the complete collection of its type from the
    // on-device mirror. The shelves below still come from Home content, but the
    // grid must not — Home shelves are capped at 24 items, which is all this
    // tab could ever show back when the grid was derived from them.
    const collectionItems = useAppNavigationSelector((state) => {
        const collection = state.mediaTypeCollections[mediaType];
        return collection.status === 'loaded' ? collection.items : NO_COLLECTION_ITEMS;
    });

    // Runs offline too. This read is served entirely by the on-device mirror —
    // it was gated on being online only because offline used to mean "hide
    // everything you haven't downloaded", which left this tab blank on a dropped
    // Wi-Fi even though every row it needed was already on disk.
    useEffect(() => {
        if (!serverConnection) {
            return;
        }
        startMediaTypeCollectionLoad(mediaType);
    }, [mediaType, serverConnection]);
    // The pull-down search surface, same as Home — mediaType IS the tab id, so
    // this page's re-tap glides only its own list to the top.
    const {
        renderScrollComponent: searchPullRenderScrollComponent,
        scrollProps: searchPullScrollProps,
    } = useSearchPull(mediaType);
    // The mirror carries no listening progress, so Continue Listening for
    // books runs on the server's own audiobooks listing (progress embedded).
    // The one network read on this screen, hence the offline gate — without it
    // the shelf spends 30s waiting on a server that isn't there.
    const isOffline = useNetworkSelector((state) => state.isOffline);
    const serverAudiobooks = useServerAudiobookProgress(
        serverConnection,
        mediaType === 'audiobooks' && !isOffline,
    );

    // Audiobooks sort — default to recents, toggleable to A-Z.
    const [audiobookSort, setAudiobookSort] = useState<LibrarySort>('recents');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const audiobookSortShortLabel = audiobookSort === 'name' ? 'A–Z' : 'Recent';

    const loadedContent = homeContentState.status === 'loaded' ? homeContentState.content : null;
    // Same identity-preserving derive Home uses — without it a re-auth's
    // artwork-token rotation would remount every tile on this tab too.
    const previousSectionsRef = useRef<HomeDisplaySection[] | undefined>(undefined);
    const sections = useMemo(() => {
        const computed = loadedContent
            ? getHomeDisplaySections(
                  loadedContent.sections,
                  recentItems,
                  serverConnection,
                  previousSectionsRef.current,
              )
            : [];
        previousSectionsRef.current = computed;
        return computed;
    }, [loadedContent, recentItems, serverConnection]);

    // The full Shows/Books catalog for the grid. The mirror collection leads so
    // it sets the order; the shelf items ride along behind it to cover the
    // window before the read lands (and offline, where they're all there is).
    // For podcasts: only PODCAST-type items (not episodes) so the grid is
    // purely a show browser — episodes appear in the shelves above only.
    const gridItems = useMemo(
        () =>
            getUniqueHomeItems(
                [
                    ...collectionItems,
                    ...sections
                        .filter((section) => !section.pending)
                        .flatMap((section) => section.items),
                ].filter((item) => {
                    if (mediaType === 'podcasts') {
                        return item.type === MobileHomeItemType.PODCAST;
                    }
                    return getLibraryMediaType(item) === mediaType;
                }),
            ),
        [collectionItems, mediaType, sections],
    );

    // Sorted grid for audiobooks.
    const sortedGridItems = useMemo(() => {
        if (mediaType !== 'audiobooks') return gridItems;
        if (audiobookSort === 'name') {
            return [...gridItems].sort((a, b) => a.title.localeCompare(b.title));
        }
        // 'recents' — the mirror read already returns the collection
        // newest-added first, so this is the order the grid is built in.
        return gridItems;
    }, [audiobookSort, gridItems, mediaType]);

    const shelves = useMemo((): HomeDisplaySection[] => {
        const shelfList: HomeDisplaySection[] = [];
        const gridItemsByKey = new Map(gridItems.map((item) => [getContentItemKey(item), item]));

        if (mediaType === 'podcasts') {
            const feedItems =
                sections.find((section) => section.key === 'podcast-feed' && !section.pending)
                    ?.items ?? [];
            // Unfinished EPISODES — recents first (freshly resolved artwork),
            // then anything in-progress from the feed window.
            const continueItems = getUniqueHomeItems(
                [
                    ...withResolvedArtwork(
                        recentItems
                            .map((recent) => recent.item)
                            .filter(isPodcastEpisodeHomeItem),
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
            // SHOWS the user has recently listened to, in recency order. A
            // played EPISODE counts for its show too (containerId → show), so
            // listening from New Episodes lands the show down here.
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

        // Audiobooks: unfinished books up top. Progress comes from the
        // SERVER's audiobooks listing (the mirror stores none) — graft it
        // onto the mirror-derived grid items by id.
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
    }, [gridItems, mediaType, recentItems, sections, serverAudiobooks, serverConnection]);

    const tabTitle = mediaType === 'podcasts' ? 'Podcasts' : 'Audiobooks';

    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle={tabTitle} />;
    }

    if (homeContentState.status === 'loading' || isTransitioning) {
        return <SkeletonTileGrid />;
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={[styles.section, { marginTop: PAGE_TOP_INSET }]}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    if (gridItems.length === 0) {
        return (
            <View style={[styles.section, { marginTop: PAGE_TOP_INSET }]}>
                <Text style={styles.mutedText}>
                    No {mediaType} in your library yet.
                </Text>
            </View>
        );
    }

    const catalogLabel = mediaType === 'podcasts' ? 'Shows' : 'Books';

    const listHeader = (
        <>
            <View>
            {shelves.map((shelf) => (
                <HomeDisplayRow
                    key={shelf.key}
                    onPrefetchItem={prefetchMediaDetailCache}
                    onSelectItem={handleSelectMediaItem}
                    section={shelf}
                    serverConnection={serverConnection}
                />
            ))}
            <View style={styles.gridTabCatalogTitleRow}>
                <Text style={[styles.sectionTitle, styles.gridTabCatalogTitle]}>
                    {catalogLabel}
                </Text>
                {mediaType === 'audiobooks' ? (
                    <Pressable
                        accessibilityLabel={`Sort audiobooks by ${audiobookSortShortLabel}. Tap to change.`}
                        accessibilityRole="button"
                        android_ripple={{ borderless: true, color: 'rgba(255, 255, 255, 0.08)' }}
                        onPress={() => {
                            triggerImpact('light');
                            setIsSortMenuOpen(true);
                        }}
                        style={styles.radioSortButton}
                    >
                        <Text style={styles.radioSortText}>{audiobookSortShortLabel}</Text>
                    </Pressable>
                ) : null}
            </View>
            {mediaType === 'audiobooks' ? (
                <LibrarySortMenu
                    activeSort={audiobookSort}
                    onClose={() => setIsSortMenuOpen(false)}
                    onSelect={(next) => {
                        setAudiobookSort(next);
                        setIsSortMenuOpen(false);
                    }}
                    visible={isSortMenuOpen}
                />
            ) : null}
            </View>
        </>
    );

    return (
        <HomeFilterGrid
            ListHeaderComponent={listHeader}
            renderScrollComponent={searchPullRenderScrollComponent}
            items={sortedGridItems}
            onPrefetchItem={prefetchMediaDetailCache}
            onSelectItem={handleSelectMediaItem}
            scrollProps={searchPullScrollProps}
            serverConnection={serverConnection}
            variant={mediaType === 'podcasts' ? 'podcast' : 'book'}
        />
    );
});

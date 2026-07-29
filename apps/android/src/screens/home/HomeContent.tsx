import { type ServerAuthenticationResult } from '@samo/core/server';
import { FlashList } from '@shopify/flash-list';
import { type ReactNode, useCallback, useDeferredValue, useMemo, useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';

import { HomeSkeletonPage, HomeSkeletonRow } from '../../components/Skeleton';
import { WarningList } from '../../components/WarningList';
import { useScrollContentBottomInset } from '../../hooks/use-scroll-content-bottom-inset';
import { useStableCallback } from '../../hooks/use-stable-callback';
import { useTransitioningMount } from '../../hooks/use-transitioning-mount';
import { type AndroidHomeContentState } from '../../services/home-content';
import { traceSync } from '../../services/jank-trace';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
} from '../../services/recent-content';
import { useHiddenHomeKeys } from '../../state/hidden-home';
import { STATUS_BAR_INSET } from '../../theme/layout';
import { styles } from '../../theme/styles';
import { colors, spacing } from '../../theme/tokens';
import { type HomeDisplaySection, type HomeFilter } from '../../types/home';
import { getContentItemKey } from '../../utils/content-item';
import {
    filterHomeDisplaySections,
    getAvailableHomeFilters,
    getHomeDisplaySections,
    getUniqueHomeItems,
} from '../../utils/home-display';
import { getLibraryMediaType } from '../../utils/library-display';
import { useSearchPull } from '../../components/search-pull/useSearchPull';
import { HomeDisplayRow } from './HomeDisplayRow';
import { HomeFilterGrid } from './HomeFilterGrid';
import { FLASH_LIST_MAINTAIN_POSITION_DISABLED } from './shared';

// Sections are ~300px tall; pre-render about two ahead so a normal scroll
// never catches a blank row while keeping boot to the visible shelves.
const HOME_SECTION_DRAW_DISTANCE = 600;

// Home's scroll hosts are ANIMATED components because the pull-down search's
// scroll handler is a Reanimated worklet (see useSearchPull) — a plain host
// would swallow it and the at-top gate would never update.
const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;

export const HomeContent = ({
    activeFilter,
    homeContentState,
    isRefreshing,
    onFilterChange,
    onPrefetchItem,
    onRefresh,
    onSelectItem,
    onViewAll,
    recentItems,
    serverConnection,
}: {
    activeFilter: HomeFilter;
    homeContentState: AndroidHomeContentState;
    isRefreshing?: boolean;
    onFilterChange: (filter: HomeFilter) => void;
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onRefresh?: () => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    recentItems: AndroidRecentContentItem[];
    serverConnection: ServerAuthenticationResult | null;
}) => {
    const bottomInset = useScrollContentBottomInset();
    const isTransitioning = useTransitioningMount();
    const {
        nativeGesture: searchPullNativeGesture,
        renderScrollComponent: searchPullRenderScrollComponent,
        scrollProps: searchPullScrollProps,
    } = useSearchPull('home');
    const stablePrefetchItem = useStableCallback(onPrefetchItem ?? (() => {}));
    const stableSelectItem = useStableCallback(onSelectItem);
    const stableViewAll = useStableCallback((section: HomeDisplaySection): void => {
        onViewAll?.(section);
    });
    const loadedContent = homeContentState.status === 'loaded' ? homeContentState.content : null;
    // Feed the last computed sections back in so identity is preserved across
    // recomputes (a serverConnection re-auth rotates every artwork token; the
    // async recentItems fill on cold boot also retriggers this) — without it,
    // every tile gets a fresh object and the whole page remounts (the cold-boot
    // "deload everything then reload everything" flash).
    const previousSectionsRef = useRef<HomeDisplaySection[] | undefined>(undefined);
    const allSections = useMemo(() => {
        // Traced: this is the one genuinely heavy SYNCHRONOUS pass left on the
        // render path (it walks every shelf of a multi-thousand-item library),
        // so when the `[jank]` monitor catches a block it can say so by name
        // instead of shrugging at "render/GC/native".
        const computed = loadedContent
            ? traceSync('home.buildDisplaySections', () =>
                  getHomeDisplaySections(
                      loadedContent.sections,
                      recentItems,
                      serverConnection,
                      previousSectionsRef.current,
                  ),
              )
            : [];
        previousSectionsRef.current = computed;
        return computed;
    }, [loadedContent, recentItems, serverConnection]);
    // Drop user-hidden items ("Remove from Home"). Preserve object identity when
    // nothing is hidden (the common case) and for shelves with no hidden items,
    // so the memoized tiles/rows don't needlessly re-render.
    const hiddenKeys = useHiddenHomeKeys();
    const visibleSections = useMemo(() => {
        if (hiddenKeys.size === 0) {
            return allSections;
        }
        return allSections
            .map((section) => {
                if (section.pending) {
                    return section;
                }
                const items = section.items.filter(
                    (item) => !hiddenKeys.has(getContentItemKey(item)),
                );
                return items.length === section.items.length ? section : { ...section, items };
            })
            .filter((section) => section.pending || section.items.length > 0);
    }, [allSections, hiddenKeys]);
    // The pill highlight follows `activeFilter` (urgent — taps feel instant), but
    // the expensive section/grid rebuild follows a DEFERRED copy so it renders at
    // low priority instead of blocking the tap. Switching filters re-renders the
    // whole (non-virtualized) section tree; doing that synchronously on the tap is
    // what froze the JS thread for ~2s with no feedback. With concurrent rendering
    // (New Arch) the old content stays painted and the pill flips immediately while
    // the new content reconciles in the background, then swaps in.
    const deferredFilter = useDeferredValue(activeFilter);
    const availableFilters = useMemo(
        () => getAvailableHomeFilters(visibleSections),
        [visibleSections],
    );
    const filteredSections = useMemo(
        () => filterHomeDisplaySections(visibleSections, deferredFilter),
        [deferredFilter, visibleSections],
    );
    const filteredGridItems = useMemo(() => {
        if (deferredFilter !== 'podcasts' && deferredFilter !== 'audiobooks') {
            return [];
        }

        const mediaType = deferredFilter === 'podcasts' ? 'podcasts' : 'audiobooks';
        return getUniqueHomeItems(
            filteredSections
                .flatMap((section) => section.items)
                .filter((item) => getLibraryMediaType(item) === mediaType),
        );
    }, [deferredFilter, filteredSections]);

    // Per-shelf horizontal scroll positions, keyed by section key. The vertical
    // FlashList below RECYCLES row components as you scroll, and a recycled
    // native ScrollView keeps its old offset — without this map, scrolling deep
    // into "Top Albums", then down the page, could hand that offset to
    // "Podcasts". Rows restore their own offset (or 0) on recycle/remount.
    const sectionScrollOffsetsRef = useRef(new Map<string, number>());
    const canViewAll = Boolean(onViewAll);
    const renderSection = useCallback(
        ({ item: section }: { item: HomeDisplaySection }) =>
            section.pending ? (
                <HomeSkeletonRow
                    count={section.skeletonCount ?? 4}
                    title={section.title || undefined}
                    variant={section.variant}
                />
            ) : (
                <HomeDisplayRow
                    allowRemoveFromHome
                    horizontalOffsets={sectionScrollOffsetsRef.current}
                    onPrefetchItem={stablePrefetchItem}
                    onSelectItem={stableSelectItem}
                    onViewAll={canViewAll ? stableViewAll : undefined}
                    section={section}
                    serverConnection={serverConnection}
                />
            ),
        [canViewAll, serverConnection, stablePrefetchItem, stableSelectItem, stableViewAll],
    );

    // Home owns its own scroll container (rendered in App's non-ScrollView tab
    // path) so the podcasts/audiobooks grid can be a real virtualized
    // FlashList instead of a non-virtualized items.map of every tile.
    // Pull-to-refresh is DISPLAY ONLY on Home. `enabled={false}` stops Android's
    // SwipeRefreshLayout from claiming the gesture, because "drag down at the
    // top" already belongs to the search pull (see useSearchPull) — two native
    // gestures on one finger is what made a pull read as down, snap back up, then
    // come down again. The spinner still shows, driven by `refreshing`: the
    // refresh itself is fired by re-tapping the Home tab (see TabScenes), which
    // is the same action without the contested gesture.
    const refreshControl = onRefresh ? (
        <RefreshControl
            colors={[colors.accent]}
            enabled={false}
            onRefresh={onRefresh}
            progressBackgroundColor={colors.surface}
            // The scroll container starts at physical y=0 now (edge-to-edge);
            // without this the spinner would pop out under the status bar.
            progressViewOffset={STATUS_BAR_INSET}
            refreshing={isRefreshing ?? false}
            tintColor={colors.accent}
        />
    ) : undefined;
    // Every Home scroll container gets the pull-down search gesture wrapped
    // around it; the search surface itself lives at the app shell (see
    // useSearchPull / SearchPullSurface).
    // Only the SCROLLER's own native gesture is wired here now. The pull pan
    // itself lives in the app shell (see SearchPullGestureHost) — it cannot live
    // in a page, because a frozen page takes its gesture relations down with it.
    const renderScrollScene = (children: ReactNode) => (
        <GestureDetector gesture={searchPullNativeGesture}>
            <Reanimated.ScrollView
                {...searchPullScrollProps}
                contentContainerStyle={[styles.homeListContent, { paddingBottom: bottomInset }]}
                refreshControl={refreshControl}
                showsVerticalScrollIndicator={false}
                style={styles.homeSceneRoot}
            >
                {children}
            </Reanimated.ScrollView>
        </GestureDetector>
    );

    if (homeContentState.status === 'idle') {
        return <View style={styles.homeSceneRoot} />;
    }

    if (homeContentState.status === 'loading' || isTransitioning) {
        return (
            <View style={styles.homeSceneRoot}>
                <HomeSkeletonPage />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return renderScrollScene(
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>,
        );
    }

    if (homeContentState.content.sections.length === 0) {
        const isOfflineContent = homeContentState.content.serverTitle === 'Offline Downloads';
        return renderScrollScene(
            <>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {isOfflineContent ? 'Offline Downloads' : 'Home'}
                    </Text>
                    <Text style={styles.mutedText}>
                        {isOfflineContent
                            ? 'No downloads yet. Download albums, playlists, podcasts, or audiobooks to use offline mode.'
                            : 'No server-backed Home content returned.'}
                    </Text>
                </View>
                <WarningList errors={homeContentState.content.errors} title="Server warnings" />
            </>,
        );
    }

    const pillsRow =
        availableFilters.length > 2 ? (
            <ScrollView
                contentContainerStyle={styles.homeFilterPills}
                horizontal
                showsHorizontalScrollIndicator={false}
            >
                {availableFilters.map((filter) => {
                    const isActive = filter.id === activeFilter;

                    return (
                        <Pressable
                            accessibilityRole="button"
                            key={filter.id}
                            onPress={() => onFilterChange(filter.id)}
                            style={[styles.homeFilterPill, isActive && styles.homeFilterPillActive]}
                        >
                            <Text
                                style={[
                                    styles.homeFilterPillText,
                                    isActive && styles.homeFilterPillTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        ) : null;

    const warnings = (
        <WarningList errors={homeContentState.content.errors} title="Server warnings" />
    );

    // Grid filters (podcasts/audiobooks) render the whole scene as a virtualized
    // FlashList with the pills as its header, so only on-screen tiles mount.
    if (
        filteredSections.length > 0 &&
        (deferredFilter === 'podcasts' || deferredFilter === 'audiobooks')
    ) {
        return (
            <HomeFilterGrid
                ListFooterComponent={warnings}
                ListHeaderComponent={pillsRow}
                renderScrollComponent={searchPullRenderScrollComponent}
                scrollProps={searchPullScrollProps}
                items={filteredGridItems}
                onPrefetchItem={stablePrefetchItem}
                onSelectItem={stableSelectItem}
                refreshControl={refreshControl}
                serverConnection={serverConnection}
                variant={deferredFilter === 'podcasts' ? 'podcast' : 'book'}
            />
        );
    }

    if (filteredSections.length === 0) {
        return renderScrollScene(
            <>
                {pillsRow}
                <View style={[styles.section, { marginTop: spacing.md }]}>
                    <Text style={styles.mutedText}>
                        No {deferredFilter === 'all' ? '' : deferredFilter + ' '}content loaded yet.
                    </Text>
                </View>
                {warnings}
            </>,
        );
    }

    // The section list is a vertical FlashList so only the visible shelves
    // (plus drawDistance) mount — a heavy Home used to mount every horizontal
    // carousel at once inside a ScrollView. Item types keep recycling pools
    // homogeneous (a 2-row band never recycles into a single-row shelf).
    // No wrapper GestureDetector here any more: `renderScrollComponent` binds the
    // scroller's native gesture to FlashList's ACTUAL inner scroll view, which is
    // the only thing this page still owns. (FlashList is a composite component
    // whose ref is the list INSTANCE, not a view, so it never could hold a
    // handler itself — which is why the pull needed a `collapsable={false}` host
    // view back when the pan lived here.)
    return (
        <ReanimatedFlashList
            ListFooterComponent={warnings}
            ListHeaderComponent={pillsRow}
            {...searchPullScrollProps}
            contentContainerStyle={[styles.homeListContent, { paddingBottom: bottomInset }]}
            data={filteredSections}
            drawDistance={HOME_SECTION_DRAW_DISTANCE}
            getItemType={(section) =>
                section.pending
                    ? `pending:${section.variant}`
                    : `${section.variant}:${section.rowCount ?? 1}`
            }
            keyExtractor={(section) => section.key}
            maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
            refreshControl={refreshControl}
            renderItem={renderSection}
            renderScrollComponent={searchPullRenderScrollComponent}
            showsVerticalScrollIndicator={false}
            style={styles.homeSceneRoot}
        />
    );
};

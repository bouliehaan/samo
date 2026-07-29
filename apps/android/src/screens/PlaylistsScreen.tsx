import { MobileHomeSectionId, type MobileHomeItem } from '@samo/core/mobile';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { LibraryListRow } from '../components/LibraryListRow';
import { useSearchPull } from '../components/search-pull/useSearchPull';
import { SkeletonListRows } from '../components/Skeleton';
import { LibrarySortMenu } from '../components/LibrarySortMenu';
import { PlusGlyph, ShuffleGlyph } from '../components/Glyphs';

import { useScrollContentBottomInset } from '../hooks/use-scroll-content-bottom-inset';
import { useTransitioningMount } from '../hooks/use-transitioning-mount';
import { PAGE_TOP_INSET } from '../theme/layout';
import { colors } from '../theme/tokens';
import { useVisibleHomeContentState } from '../hooks/use-visible-home-content';
import { useVisibleRecentItems } from '../hooks/use-visible-recent-items';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';
import { LIBRARY_SORTS, type LibrarySort } from '../types/library-tab';
import { type PlaylistsScreenProps } from '../types/playlists';
import { getSectionsById, sortHomeItemsByRecents } from '../utils/home-display';
import { type LibraryDisplayItem } from '../types/library-display';
import { toLibraryDisplayItem } from '../utils/library-display';
import { EmptyServerBackedScreen } from './EmptyServerBackedScreen';

// Animated host so the pull-down search's scroll handler runs on the UI thread
// — a plain FlashList would swallow the worklet (see useSearchPull).
const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;

export const PlaylistsScreen = memo(({
    onCreatePlaylist,
    onSelectItem,
    onShufflePlay,
    showCreatePlaylist = false,
}: PlaylistsScreenProps) => {
    const homeContentState = useVisibleHomeContentState();
    const recentItems = useVisibleRecentItems();
    const isTransitioning = useTransitioningMount();
    const {
        renderScrollComponent: searchPullRenderScrollComponent,
        scrollProps: searchPullScrollProps,
    } = useSearchPull('playlists');
    const [activeSort, setActiveSort] = useState<LibrarySort>('recents');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const basePlaylists = useMemo(() => {
        if (homeContentState.status !== 'loaded') {
            return [];
        }
        return getSectionsById(homeContentState, [MobileHomeSectionId.PLAYLISTS])[0]?.items ?? [];
    }, [homeContentState]);
    const playlists = useMemo(
        () =>
            activeSort === 'name'
                ? [...basePlaylists].sort((left, right) => left.title.localeCompare(right.title))
                : sortHomeItemsByRecents(basePlaylists, recentItems),
        [activeSort, basePlaylists, recentItems],
    );
    const allPlayableItems = useMemo(
        () => playlists.filter((playlist) => playlist.playback),
        [playlists],
    );
    const bottomInset = useScrollContentBottomInset();

    // Pre-derive the virtualizable rows: each carries its display model + the
    // original item for onPress. Building this once (not per render row) keeps
    // FlashList's recycled renderItem cheap.
    const rows = useMemo(
        () =>
            playlists
                .map((item) => {
                    const displayItem = toLibraryDisplayItem(item);
                    return displayItem ? { displayItem, item } : null;
                })
                .filter((row): row is { displayItem: LibraryDisplayItem; item: MobileHomeItem } =>
                    row !== null,
                ),
        [playlists],
    );

    const renderRow = useCallback(
        ({ item: row }: { item: { displayItem: LibraryDisplayItem; item: MobileHomeItem } }) => (
            <LibraryListRow displayItem={row.displayItem} onPress={() => onSelectItem(row.item)} />
        ),
        [onSelectItem],
    );

    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle="Playlists" />;
    }

    if (homeContentState.status === 'loading' || isTransitioning) {
        return <SkeletonListRows />;
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={[styles.section, { marginTop: PAGE_TOP_INSET }]}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const activeSortLabel =
        LIBRARY_SORTS.find((sort) => sort.id === activeSort)?.label ?? 'Recents';
    const activeSortShortLabel = activeSort === 'name' ? 'Name' : 'Recent';


    const createButton =
        showCreatePlaylist && onCreatePlaylist ? (
            <Pressable
                accessibilityLabel="Create playlist"
                accessibilityRole="button"
                onPress={() => {
                    triggerImpact('light');
                    onCreatePlaylist();
                }}
                style={styles.radioAddIconButton}
            >
                <PlusGlyph color={colors.muted} size={18} />
            </Pressable>
        ) : null;

    if (playlists.length === 0) {
        return (
            <View style={[styles.playlistScreen, styles.playlistListContent]}>
                <View style={styles.playlistTopPanel}>
                    <View style={styles.pageControlsRow}>
                        <View style={styles.playlistControlsGroup} />
                        <View style={styles.playlistControlsGroup}>{createButton}</View>
                    </View>
                </View>
                <Text style={styles.mutedText}>No server-backed playlists returned.</Text>
            </View>
        );
    }

    // No page title — just the useful bits on one quiet row: sort on the
    // left, shuffle + create on the right. The search drawer rides above it,
    // wrapped in the HOME_EDGE_PADDING context its field expects (this list's
    // content container isn't padded — the rows inset themselves).
    const listHeader = (
        <>
        <View style={styles.playlistTopPanel}>
            <View style={styles.pageControlsRow}>
                <Pressable
                    accessibilityLabel={`Sort by ${activeSortLabel}. Tap to change.`}
                    accessibilityRole="button"
                    android_ripple={{ borderless: true, color: 'rgba(255, 255, 255, 0.08)' }}
                    onPress={() => {
                        triggerImpact('light');
                        setIsSortMenuOpen(true);
                    }}
                    style={styles.radioSortButton}
                >
                    <Text style={styles.radioSortText}>{activeSortShortLabel}</Text>
                </Pressable>
                <View style={styles.playlistControlsGroup}>
                    {allPlayableItems.length > 1 ? (
                        <Pressable
                            accessibilityLabel="Shuffle all playlists"
                            accessibilityRole="button"
                            onPress={() => void onShufflePlay(allPlayableItems)}
                            style={styles.playlistPillButton}
                        >
                            <ShuffleGlyph color={colors.background} />
                            <Text style={styles.playlistPillButtonText}>Shuffle</Text>
                        </Pressable>
                    ) : null}
                    {createButton}
                </View>
            </View>
        </View>
        </>
    );

    return (
        <View style={styles.playlistScreen}>
            <ReanimatedFlashList
                ListHeaderComponent={listHeader}
                contentContainerStyle={[styles.playlistListContent, { paddingBottom: bottomInset }]}
                data={rows}
                keyExtractor={(row) => row.displayItem.key}
                renderItem={renderRow}
                renderScrollComponent={searchPullRenderScrollComponent}
                showsVerticalScrollIndicator={false}
                {...searchPullScrollProps}
            />
            <LibrarySortMenu
                activeSort={activeSort}
                onClose={() => setIsSortMenuOpen(false)}
                onSelect={(next) => {
                    setActiveSort(next);
                    setIsSortMenuOpen(false);
                }}
                visible={isSortMenuOpen}
            />
        </View>
    );
});

PlaylistsScreen.displayName = 'PlaylistsScreen';

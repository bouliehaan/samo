import { MobileHomeSectionId, type MobileHomeItem } from '@samo/core/mobile';
import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { LibraryListRow } from '../components/LibraryListRow';
import { LibrarySortMenu } from '../components/LibrarySortMenu';
import { PlusGlyph, ShuffleGlyph, SortGlyph } from '../components/Glyphs';
import { colors } from '../theme/tokens';
import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidRecentContentItem } from '../services/recent-content';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';
import { LIBRARY_SORTS, type LibrarySort } from '../types/library-tab';
import { type PlaylistsScreenProps } from '../types/playlists';
import { getSectionsById, sortHomeItemsByRecents } from '../utils/home-display';
import { toLibraryDisplayItem } from '../utils/library-display';
import { EmptyServerBackedScreen } from './EmptyServerBackedScreen';

export const PlaylistsScreen = memo(({
    homeContentState,
    onCreatePlaylist,
    onSelectItem,
    onShufflePlay,
    recentItems,
    showCreatePlaylist = false,
}: PlaylistsScreenProps) => {
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

    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle="Playlists" />;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const activeSortLabel =
        LIBRARY_SORTS.find((sort) => sort.id === activeSort)?.label ?? 'Recents';

    if (playlists.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playlists</Text>
                <Text style={styles.mutedText}>No server-backed playlists returned.</Text>
                {showCreatePlaylist && onCreatePlaylist ? (
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
                ) : null}
            </View>
        );
    }

    return (
        <View style={styles.playlistScreen}>
            <View style={styles.playlistTopPanel}>
                <View>
                    <Text style={styles.libraryEyebrow}>Playlists</Text>
                    <Text style={styles.playlistSummary}>
                        {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
                    </Text>
                </View>
                <View style={styles.playlistHeaderActions}>
                    {showCreatePlaylist && onCreatePlaylist ? (
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
                    ) : null}
                    <Pressable
                        accessibilityLabel={`Sort by ${activeSortLabel}. Tap to change.`}
                        accessibilityRole="button"
                        android_ripple={{ borderless: true, color: 'rgba(255, 255, 255, 0.08)' }}
                        onPress={() => {
                            triggerImpact('light');
                            setIsSortMenuOpen(true);
                        }}
                        style={styles.librarySortBadge}
                    >
                        <SortGlyph color={colors.muted} />
                        <Text style={styles.librarySortText}>{activeSortLabel}</Text>
                    </Pressable>
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
                </View>
            </View>
            <View style={styles.libraryList}>
                {playlists.map((item) => {
                    const displayItem = toLibraryDisplayItem(item);

                    return displayItem ? (
                        <LibraryListRow
                            displayItem={displayItem}
                            key={displayItem.key}
                            onPress={() => onSelectItem(item)}
                        />
                    ) : null;
                })}
            </View>
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

import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { LibraryFilterPills } from '../components/LibraryFilterPills';
import { LibraryListRow } from '../components/LibraryListRow';
import { LibrarySortMenu } from '../components/LibrarySortMenu';
import { SortGlyph } from '../components/Glyphs';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { type LibraryDisplayItem } from '../types/library-display';
import {
    LIBRARY_FILTERS,
    LIBRARY_ROW_DRAW_DISTANCE,
    LIBRARY_SORTS,
    type LibraryFilter,
    type LibraryScreenProps,
    type LibrarySort,
} from '../types/library-tab';
import {
    getAvailableLibraryFilters,
    getBaseLibraryItems,
    getLibraryRows,
} from '../utils/library-rows';
import { EmptyServerBackedScreen } from './EmptyServerBackedScreen';

const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

export const LibraryScreen = memo(({
    fullCollections,
    fullCollectionsEnabled,
    hasServerConnections,
    homeContentState,
    onSelectItem,
    recentItems,
}: LibraryScreenProps) => {
    const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
    const [activeSort, setActiveSort] = useState<LibrarySort>('recents');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const baseItems = useMemo(
        () => getBaseLibraryItems(homeContentState, fullCollections),
        [fullCollections, homeContentState],
    );
    const filters = useMemo(
        () => getAvailableLibraryFilters(baseItems, recentItems, fullCollections),
        [baseItems, fullCollections, recentItems],
    );
    const rows = useMemo(
        () => getLibraryRows(baseItems, recentItems, activeFilter, '', activeSort),
        [activeFilter, activeSort, baseItems, recentItems],
    );
    const fullCollectionState =
        activeFilter === 'albums'
            ? fullCollections.albums
            : activeFilter === 'artists'
              ? fullCollections.artists
              : null;
    const isWaitingForFullCollection =
        fullCollectionsEnabled &&
        fullCollectionState !== null &&
        (fullCollectionState.status === 'idle' || fullCollectionState.status === 'loading');
    const visibleRows = isWaitingForFullCollection ? [] : rows;
    const renderLibraryRow = useCallback(
        ({ item }: { item: LibraryDisplayItem }) => (
            <LibraryListRow
                displayItem={item}
                onPress={() => onSelectItem(item.item)}
            />
        ),
        [onSelectItem],
    );

    if (!hasServerConnections) {
        return (
            <View style={styles.libraryStaticContent}>
                <EmptyServerBackedScreen tabTitle="Library" />
            </View>
        );
    }

    if (homeContentState.status === 'idle' || homeContentState.status === 'loading') {
        return (
            <View style={styles.libraryStaticContent}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.libraryStaticContent}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const activeLabel =
        LIBRARY_FILTERS.find((filter) => filter.id === activeFilter)?.label ?? 'All';
    const activeSortLabel =
        LIBRARY_SORTS.find((sort) => sort.id === activeSort)?.label ?? 'Recents';
    const summaryText = isWaitingForFullCollection
        ? `Loading ${activeLabel.toLowerCase()}...`
        : `${rows.length} ${rows.length === 1 ? 'item' : 'items'} - ${activeLabel}`;

    return (
        <View style={styles.libraryScreen}>
            <FlashList
                contentContainerStyle={styles.libraryListContent}
                data={visibleRows}
                drawDistance={LIBRARY_ROW_DRAW_DISTANCE}
                keyExtractor={(row) => row.key}
                ListEmptyComponent={
                    <View style={styles.libraryEmptyState}>
                        {isWaitingForFullCollection ? (
                            <ActivityIndicator color={colors.accent} />
                        ) : (
                            <Text style={styles.mutedText}>Nothing to show here yet.</Text>
                        )}
                    </View>
                }
                ListHeaderComponent={
                    <View>
                        <View style={styles.libraryHeaderRow}>
                            <View style={styles.libraryHeaderText}>
                                <Text style={styles.libraryEyebrow}>Your Library</Text>
                                <Text style={styles.librarySummary} numberOfLines={1}>
                                    {summaryText}
                                </Text>
                            </View>
                            <Pressable
                                accessibilityLabel={`Sort by ${activeSortLabel}. Tap to change.`}
                                accessibilityRole="button"
                                android_ripple={{
                                    borderless: true,
                                    color: 'rgba(255, 255, 255, 0.08)',
                                }}
                                onPress={() => {
                                    triggerImpact('light');
                                    setIsSortMenuOpen(true);
                                }}
                                style={styles.librarySortBadge}
                            >
                                <SortGlyph color={colors.muted} />
                                <Text style={styles.librarySortText}>{activeSortLabel}</Text>
                            </Pressable>
                        </View>
                        <LibraryFilterPills
                            activeFilter={activeFilter}
                            filters={filters}
                            onChange={setActiveFilter}
                        />
                    </View>
                }
                maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                renderItem={renderLibraryRow}
                showsVerticalScrollIndicator={false}
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

LibraryScreen.displayName = 'LibraryScreen';

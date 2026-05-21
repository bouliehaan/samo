import { type MobileHomeItem } from '@samo/core/mobile';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { CollectionBrowseGrid } from '../components/CollectionBrowseGrid';
import { LibraryFilterPills } from '../components/LibraryFilterPills';
import { LibraryListRow } from '../components/LibraryListRow';
import { LibraryScopeMenu } from '../components/LibraryScopeMenu';
import { LibrarySortMenu } from '../components/LibrarySortMenu';
import { SortGlyph } from '../components/Glyphs';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { type LibraryDisplayItem } from '../types/library-display';
import {
    LIBRARY_FILTERS,
    LIBRARY_ROW_DRAW_DISTANCE,
    LIBRARY_SCOPES,
    LIBRARY_SORTS,
    type LibraryFilter,
    type LibraryScreenProps,
    type LibraryScope,
    type LibrarySort,
} from '../types/library-tab';
import {
    getAvailableLibraryFilters,
    getLibraryBaseItems,
    getLibraryRows,
} from '../utils/library-rows';
import { EmptyServerBackedScreen } from './EmptyServerBackedScreen';

const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

const isCollectionBrowseFilter = (filter: LibraryFilter) =>
    filter === 'albums' || filter === 'artists';

export const LibraryScreen = memo(({
    fullCollections,
    fullCollectionsEnabled,
    hasServerConnections,
    homeContentState,
    libraryRelevantState,
    onEnsureFullCollections,
    onSelectItem,
    recentItems,
}: LibraryScreenProps) => {
    const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
    const [activeScope, setActiveScope] = useState<LibraryScope>('relevant');
    const [activeSort, setActiveSort] = useState<LibrarySort>('recents');
    const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const baseItems = useMemo(
        () =>
            getLibraryBaseItems(
                activeScope,
                homeContentState,
                libraryRelevantState,
                fullCollections,
            ),
        [activeScope, fullCollections, homeContentState, libraryRelevantState],
    );
    const filters = useMemo(
        () => getAvailableLibraryFilters(baseItems, recentItems, fullCollections),
        [baseItems, fullCollections, recentItems],
    );
    const rows = useMemo(
        () => getLibraryRows(baseItems, recentItems, activeFilter, '', activeSort),
        [activeFilter, activeSort, baseItems, recentItems],
    );

    const needsFullCollection =
        activeScope === 'all' && isCollectionBrowseFilter(activeFilter);
    const fullCollectionState =
        activeFilter === 'albums'
            ? fullCollections.albums
            : activeFilter === 'artists'
              ? fullCollections.artists
              : null;
    const isEnrichingFullCollection =
        fullCollectionsEnabled &&
        needsFullCollection &&
        fullCollectionState !== null &&
        fullCollectionState.status !== 'loaded';

    useEffect(() => {
        if (!needsFullCollection || !onEnsureFullCollections) {
            return;
        }

        onEnsureFullCollections();
    }, [needsFullCollection, onEnsureFullCollections]);

    const browseSeedItems = useMemo(
        () => rows.map((row) => row.item) as MobileHomeItem[],
        [rows],
    );
    const browseFullItems = useMemo(() => {
        if (activeScope !== 'all' || fullCollectionState?.status !== 'loaded') {
            return undefined;
        }

        return fullCollectionState.items;
    }, [activeScope, fullCollectionState]);

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

    if (
        homeContentState.status === 'idle' ||
        homeContentState.status === 'loading' ||
        (activeScope === 'relevant' &&
            (libraryRelevantState.status === 'idle' ||
                libraryRelevantState.status === 'loading'))
    ) {
        return (
            <View style={styles.libraryStaticContent}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (
        homeContentState.status === 'error' ||
        (activeScope === 'relevant' && libraryRelevantState.status === 'error')
    ) {
        const message =
            activeScope === 'relevant' && libraryRelevantState.status === 'error'
                ? libraryRelevantState.message
                : homeContentState.status === 'error'
                  ? homeContentState.message
                  : 'Could not load your library.';

        return (
            <View style={styles.libraryStaticContent}>
                <Text style={styles.errorText}>{message}</Text>
            </View>
        );
    }

    const activeLabel =
        LIBRARY_FILTERS.find((filter) => filter.id === activeFilter)?.label ?? 'All';
    const activeScopeLabel =
        LIBRARY_SCOPES.find((scope) => scope.id === activeScope)?.label ?? 'Relevant';
    const activeSortLabel =
        LIBRARY_SORTS.find((sort) => sort.id === activeSort)?.label ?? 'Recents';
    const summaryText = isEnrichingFullCollection
        ? `${rows.length} ${rows.length === 1 ? 'item' : 'items'} - loading all ${activeLabel.toLowerCase()}...`
        : `${rows.length} ${rows.length === 1 ? 'item' : 'items'} - ${activeLabel}`;

    const header = (
        <View>
            <View style={styles.libraryHeaderRow}>
                <View style={styles.libraryHeaderText}>
                    <Text style={styles.libraryEyebrow}>Your Library</Text>
                    <Text style={styles.librarySummary} numberOfLines={1}>
                        {summaryText}
                    </Text>
                </View>
                <View style={styles.libraryHeaderActions}>
                    <Pressable
                        accessibilityLabel={`Library scope: ${activeScopeLabel}. Tap to change.`}
                        accessibilityRole="button"
                        android_ripple={{
                            borderless: true,
                            color: 'rgba(255, 255, 255, 0.08)',
                        }}
                        onPress={() => {
                            triggerImpact('light');
                            setIsScopeMenuOpen(true);
                        }}
                        style={styles.librarySortBadge}
                    >
                        <Text style={styles.librarySortText}>{activeScopeLabel}</Text>
                    </Pressable>
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
            </View>
            <LibraryFilterPills
                activeFilter={activeFilter}
                filters={filters}
                onChange={setActiveFilter}
            />
        </View>
    );

    if (isCollectionBrowseFilter(activeFilter)) {
        return (
            <View style={styles.libraryScreen}>
                <View style={styles.libraryBrowseChrome}>{header}</View>
                <CollectionBrowseGrid
                    emptyMessage={
                        isEnrichingFullCollection
                            ? undefined
                            : 'Nothing to show here yet.'
                    }
                    fullItems={browseFullItems}
                    isLoading={isEnrichingFullCollection && browseSeedItems.length === 0}
                    onSelectItem={onSelectItem}
                    seedItems={browseSeedItems}
                />
                <LibraryScopeMenu
                    activeScope={activeScope}
                    onClose={() => setIsScopeMenuOpen(false)}
                    onSelect={(next) => {
                        setActiveScope(next);
                        setIsScopeMenuOpen(false);
                    }}
                    visible={isScopeMenuOpen}
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
    }

    return (
        <View style={styles.libraryScreen}>
            <FlashList
                contentContainerStyle={styles.libraryListContent}
                data={rows}
                drawDistance={LIBRARY_ROW_DRAW_DISTANCE}
                keyExtractor={(row) => row.key}
                ListEmptyComponent={
                    <View style={styles.libraryEmptyState}>
                        <Text style={styles.mutedText}>Nothing to show here yet.</Text>
                    </View>
                }
                ListHeaderComponent={header}
                maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                renderItem={renderLibraryRow}
                showsVerticalScrollIndicator={false}
            />
            <LibraryScopeMenu
                activeScope={activeScope}
                onClose={() => setIsScopeMenuOpen(false)}
                onSelect={(next) => {
                    setActiveScope(next);
                    setIsScopeMenuOpen(false);
                }}
                visible={isScopeMenuOpen}
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

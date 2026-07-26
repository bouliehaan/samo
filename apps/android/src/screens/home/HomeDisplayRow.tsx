import { type ServerAuthenticationResult } from '@samo/core/server';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import {
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    Text,
    View,
} from 'react-native';

import { type AndroidRecentContentSourceItem } from '../../services/recent-content';
import { getHomeRowItemLength, getHomeSectionRowHeight } from '../../theme/layout';
import { styles } from '../../theme/styles';
import { type HomeDisplaySection } from '../../types/home';
import { getContentItemKey } from '../../utils/content-item';
import { getViewAllVariant } from '../../utils/home-display';
import { HomeExploreHero } from './HomeExploreHero';
import { HomeMediaTile } from './HomeMediaTile';
import { FLASH_LIST_MAINTAIN_POSITION_DISABLED } from './shared';

interface HomeDisplayRowProps {
    allowRemoveFromHome?: boolean;
    /** When rendered inside the recycling section list: per-section-key store
     *  of the shelf's horizontal scroll offset, restored on recycle/remount. */
    horizontalOffsets?: Map<string, number>;
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    section: HomeDisplaySection;
    serverConnection: ServerAuthenticationResult | null;
}

/** The slice of the FlashList ref the offset restore needs (dodges the
 *  list-item generic, which differs between the 1-row and multi-row shelves). */
type HorizontalShelfHandle = {
    scrollToOffset: (params: { animated?: boolean; offset: number }) => void;
};

/** TL → TR → BL → BR per 2-row band, then continue columns to the right. */
const chunkHomeSectionItems = (
    items: AndroidRecentContentSourceItem[],
    rowCount: number,
): AndroidRecentContentSourceItem[][] => {
    if (rowCount <= 1) {
        return items.map((item) => [item]);
    }

    const columnCount = Math.ceil(items.length / rowCount);
    const columns: AndroidRecentContentSourceItem[][] = [];

    for (let column = 0; column < columnCount; column += 1) {
        const columnItems: AndroidRecentContentSourceItem[] = [];
        for (let row = 0; row < rowCount; row += 1) {
            const index = column * rowCount + row;
            if (index < items.length) {
                columnItems.push(items[index]);
            }
        }
        if (columnItems.length > 0) {
            columns.push(columnItems);
        }
    }

    return columns;
};

export const HomeDisplayRow = memo(({
    allowRemoveFromHome,
    horizontalOffsets,
    onPrefetchItem,
    onSelectItem,
    onViewAll,
    section,
    serverConnection,
}: HomeDisplayRowProps) => {
    const viewAllVariant = getViewAllVariant(section.variant);
    const canViewAll = viewAllVariant !== null && Boolean(onViewAll);
    const rowCount = section.rowCount ?? 1;
    const itemLength = getHomeRowItemLength(section.variant);
    const rowHeight = getHomeSectionRowHeight(section.variant, rowCount);
    const drawDistance = itemLength * 4;
    const columns = useMemo(
        () => (rowCount > 1 ? chunkHomeSectionItems(section.items, rowCount) : []),
        [rowCount, section.items],
    );

    // Recycle-safe horizontal position: when the vertical list reuses this row
    // for a DIFFERENT section (key change), snap to that section's remembered
    // offset (or the start) before paint — never the previous section's.
    const shelfRef = useRef<HorizontalShelfHandle | null>(null);
    // Callback ref: FlashList's ref generic differs per branch, but both
    // satisfy the structural handle (param contravariance makes this assign).
    const setShelfRef = useCallback((instance: HorizontalShelfHandle | null) => {
        shelfRef.current = instance;
    }, []);
    const sectionKey = section.key;
    useLayoutEffect(() => {
        if (!horizontalOffsets) {
            return;
        }
        shelfRef.current?.scrollToOffset({
            animated: false,
            offset: horizontalOffsets.get(sectionKey) ?? 0,
        });
    }, [horizontalOffsets, sectionKey]);
    const rememberShelfOffset = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            horizontalOffsets?.set(sectionKey, event.nativeEvent.contentOffset.x);
        },
        [horizontalOffsets, sectionKey],
    );
    const renderItem = useCallback(
        ({ item }: { item: AndroidRecentContentSourceItem }) => (
            <HomeMediaTile
                allowRemoveFromHome={allowRemoveFromHome}
                item={item}
                onPrefetchItem={onPrefetchItem}
                onSelectItem={onSelectItem}
                sectionVariant={section.variant}
                serverConnection={serverConnection}
            />
        ),
        [allowRemoveFromHome, onPrefetchItem, onSelectItem, section.variant, serverConnection],
    );
    const renderColumn = useCallback(
        ({ item: column }: { item: AndroidRecentContentSourceItem[] }) => (
            <View style={styles.homeMultiRowColumn}>
                {column.map((item) => (
                    <HomeMediaTile
                        allowRemoveFromHome={allowRemoveFromHome}
                        item={item}
                        key={getContentItemKey(item)}
                        onPrefetchItem={onPrefetchItem}
                        onSelectItem={onSelectItem}
                        sectionVariant={section.variant}
                        serverConnection={serverConnection}
                    />
                ))}
            </View>
        ),
        [allowRemoveFromHome, onPrefetchItem, onSelectItem, section.variant, serverConnection],
    );

    return (
        <View style={styles.homeSection}>
            {section.title ? (
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {canViewAll ? (
                        <Pressable
                            accessibilityLabel={`View all ${section.title}`}
                            accessibilityRole="button"
                            hitSlop={8}
                            onPress={() => onViewAll?.(section)}
                            style={styles.sectionViewAll}
                        >
                            <Text style={styles.sectionViewAllLabel}>View All</Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
            {section.variant === 'explo' && section.items[0] ? (
                <HomeExploreHero
                    item={section.items[0]}
                    onPrefetchItem={onPrefetchItem}
                    onSelectItem={onSelectItem}
                    serverConnection={serverConnection}
                />
            ) : rowCount > 1 ? (
                <FlashList
                    data={columns}
                    drawDistance={drawDistance}
                    horizontal
                    keyExtractor={(column) => column.map(getContentItemKey).join('|')}
                    maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                    onMomentumScrollEnd={rememberShelfOffset}
                    onScrollEndDrag={rememberShelfOffset}
                    ref={setShelfRef}
                    renderItem={renderColumn}
                    showsHorizontalScrollIndicator={false}
                    style={{ ...styles.homeRowList, height: rowHeight }}
                />
            ) : (
                <FlashList
                    data={section.items}
                    drawDistance={drawDistance}
                    horizontal
                    keyExtractor={getContentItemKey}
                    maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                    onMomentumScrollEnd={rememberShelfOffset}
                    onScrollEndDrag={rememberShelfOffset}
                    ref={setShelfRef}
                    renderItem={renderItem}
                    showsHorizontalScrollIndicator={false}
                    style={{ ...styles.homeRowList, height: rowHeight }}
                />
            )}
        </View>
    );
});

HomeDisplayRow.displayName = 'HomeDisplayRow';

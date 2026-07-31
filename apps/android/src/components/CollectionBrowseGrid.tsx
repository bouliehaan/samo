import {
    getItemQualityProfile,
    type MobileHomeItem,
    MobileHomeItemType,
} from '@samo/core/mobile';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AlphabetSidebar } from './AlphabetSidebar';
import { ArtworkImage } from './ArtworkImage';
import { PressableScale } from './PressableScale';
import { QualityBadge } from './QualityBadge';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { type AlphabetRailRow, useAlphabetRail } from '../hooks/use-alphabet-rail';
import { useScrollContentBottomInset } from '../hooks/use-scroll-content-bottom-inset';
import { type CollectionItemSortMode } from '../utils/collection-sort';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { VIEW_ALL_ROW_HEIGHT } from '../theme/layout';
import { presses } from '../theme/motion';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

type BrowseTileProps = {
    item: MobileHomeItem;
    onOpenContextMenu: (item: MobileHomeItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
};

const BrowseTile = memo(({ item, onOpenContextMenu, onSelectItem }: BrowseTileProps) => {
    const isArtist = item.type === MobileHomeItemType.ARTIST;
    const tileBadgeProfile =
        item.type === MobileHomeItemType.PLAYLIST ? undefined : getItemQualityProfile(item);

    return (
        <PressableScale
            {...presses.tile}
            accessibilityRole="button"
            onLongPress={() => onOpenContextMenu(item)}
            onPress={() => onSelectItem(item)}
            style={styles.viewAllTile}
        >
            <ArtworkImage
                artworkImageId={item.artworkImageId}
                contentSource={item.source}
                fallbackStyle={[
                    styles.viewAllTileArtworkFallback,
                    isArtist && styles.libraryArtworkRound,
                ]}
                letter={item.title.slice(0, 1).toUpperCase()}
                style={[styles.viewAllTileArtwork, isArtist && styles.libraryArtworkRound]}
                uri={item.artworkUrl}
            />
            <View style={styles.tileMetaRow}>
                <View style={styles.tileMetaTextCol}>
                    <Text numberOfLines={1} style={styles.viewAllTileTitle}>
                        {item.title}
                    </Text>
                    {item.subtitle ? (
                        <Text numberOfLines={1} style={styles.viewAllTileSubtitle}>
                            {item.subtitle}
                        </Text>
                    ) : null}
                </View>
                <QualityBadge tile profile={tileBadgeProfile} />
            </View>
        </PressableScale>
    );
});
BrowseTile.displayName = 'BrowseTile';

export const CollectionBrowseGrid = memo(({
    emptyMessage = 'Nothing to show here yet.',
    fullItems,
    isForeground = true,
    isLoading = false,
    itemSortMode = 'alphabetical',
    onSelectItem,
    resetKey,
    seedItems = [],
}: {
    emptyMessage?: string;
    fullItems?: MobileHomeItem[];
    isForeground?: boolean;
    isLoading?: boolean;
    itemSortMode?: CollectionItemSortMode;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    resetKey?: number | string;
    seedItems: MobileHomeItem[];
}) => {
    const contextMenu = useMediaContextMenu();
    const bottomInset = useScrollContentBottomInset();

    const mergedItems = useMemo(() => {
        const merged: MobileHomeItem[] = [];
        const seen = new Set<string>();
        for (const item of [...(fullItems ?? []), ...seedItems]) {
            if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') {
                continue;
            }
            const key = getRecentContentItemKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(item);
        }
        return merged;
    }, [fullItems, seedItems]);

    const { jumpFeedbackLetter, letterIndex, listRef, onJumpToLetter, rows } = useAlphabetRail({
        baseSortMode: itemSortMode,
        isForeground,
        items: mergedItems,
        resetKey,
    });

    const handleOpenContextMenu = useCallback(
        (item: MobileHomeItem) => contextMenu.openForItem(item),
        [contextMenu],
    );

    const renderRow = useCallback(
        ({ item: row }: { item: AlphabetRailRow }) => (
            <View style={styles.viewAllRow}>
                <BrowseTile
                    item={row.left}
                    onOpenContextMenu={handleOpenContextMenu}
                    onSelectItem={onSelectItem}
                />
                {row.right ? (
                    <BrowseTile
                        item={row.right}
                        onOpenContextMenu={handleOpenContextMenu}
                        onSelectItem={onSelectItem}
                    />
                ) : (
                    <View style={styles.viewAllTilePlaceholder} />
                )}
            </View>
        ),
        [handleOpenContextMenu, onSelectItem],
    );

    const keyExtractor = useCallback((row: AlphabetRailRow) => row.key, []);

    return (
        <View style={styles.libraryBrowseBody}>
            {rows.length === 0 ? (
                isLoading ? (
                    <ActivityIndicator color={colors.accent} />
                ) : (
                    <Text style={styles.viewAllEmpty}>{emptyMessage}</Text>
                )
            ) : (
                <FlashList
                    contentContainerStyle={[
                        styles.libraryBrowseListContent,
                        { paddingBottom: bottomInset },
                    ]}
                    data={rows}
                    // FlashList buffers `drawDistance * 2`, split 70/30 toward the
                    // scroll direction — ~2.8 rows ahead, ~1.2 behind. See the note
                    // in ViewAllScreen for what `* 8` was costing.
                    drawDistance={VIEW_ALL_ROW_HEIGHT * 2}
                    keyExtractor={keyExtractor}
                    maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                    ref={listRef}
                    renderItem={renderRow}
                    showsVerticalScrollIndicator={false}
                />
            )}
            <AlphabetSidebar activeLetters={letterIndex} onJumpToLetter={onJumpToLetter} />
            {jumpFeedbackLetter ? (
                <View pointerEvents="none" style={styles.viewAllJumpOverlay}>
                    <Text style={styles.viewAllJumpOverlayText}>{jumpFeedbackLetter}</Text>
                </View>
            ) : null}
        </View>
    );
});
CollectionBrowseGrid.displayName = 'CollectionBrowseGrid';

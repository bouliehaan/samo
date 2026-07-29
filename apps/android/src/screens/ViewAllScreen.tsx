import {
    getItemQualityProfile,
    type MobileHomeItem,
    MobileHomeItemType,
} from '@samo/core/mobile';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AlphabetSidebar } from '../components/AlphabetSidebar';
import { ArtworkImage } from '../components/ArtworkImage';
import { SkeletonTile } from '../components/Skeleton';
import { QualityBadge } from '../components/QualityBadge';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { type AlphabetRailRow, useAlphabetRail } from '../hooks/use-alphabet-rail';
import { useScrollContentBottomInset } from '../hooks/use-scroll-content-bottom-inset';
import { type AndroidFullCollectionState } from '../services/full-collection';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { type CollectionItemSortMode } from '../utils/collection-sort';
import { chromeGlassScrollProps } from '../state/chrome-glass';
import { VIEW_ALL_ROW_HEIGHT } from '../theme/layout';
import { styles } from '../theme/styles';
import { type ViewAllRoute } from '../types/view-all';

const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

type ViewAllTileProps = {
    item: MobileHomeItem;
    onOpenContextMenu: (item: MobileHomeItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
};

const ViewAllTile = memo(({ item, onOpenContextMenu, onSelectItem }: ViewAllTileProps) => {
    const isArtist = item.type === MobileHomeItemType.ARTIST;
    // Playlists are mixed format, so never show a collection-level badge.
    const tileBadgeProfile =
        item.type === MobileHomeItemType.PLAYLIST ? undefined : getItemQualityProfile(item);

    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => onOpenContextMenu(item)}
            onPress={() => onSelectItem(item)}
            style={styles.viewAllTile}
        >
            <ArtworkImage
                artworkImageId={item.artworkImageId}
                contentSource={item.source}
                decodeFormat="rgb"
                fallbackStyle={[
                    styles.viewAllTileArtworkFallback,
                    isArtist && styles.libraryArtworkRound,
                ]}
                letter={item.title.slice(0, 1).toUpperCase()}
                style={[
                    styles.viewAllTileArtwork,
                    isArtist && styles.libraryArtworkRound,
                ]}
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
        </Pressable>
    );
});
ViewAllTile.displayName = 'ViewAllTile';

interface ViewAllScreenProps {
    fullState: AndroidFullCollectionState;
    onBack: () => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    route: ViewAllRoute;
}

export const ViewAllScreen = memo(({
    fullState,
    onBack,
    onSelectItem,
    route,
}: ViewAllScreenProps) => {
    const contextMenu = useMediaContextMenu();
    const bottomInset = useScrollContentBottomInset();
    const isLoading = fullState.status === 'loading';
    const isError = fullState.status === 'error';

    const mergedItems = useMemo(() => {
        // Prefer the exhaustive list once it lands; until then show the
        // home-content slice the route was opened with so the grid isn't empty
        // during the fetch. Merge the cached items either way so a brief stale
        // state can't drop favorites that the full fetch missed.
        const fullItems = fullState.status === 'loaded' ? fullState.items : [];
        const sourceItems = fullState.status === 'loaded'
            ? [...fullItems, ...route.items]
            : route.items;
        const merged: MobileHomeItem[] = [];
        const seen = new Set<string>();
        for (const item of sourceItems) {
            if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') {
                continue;
            }
            const key = getRecentContentItemKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(item);
        }
        return merged;
    }, [fullState, route.items]);

    // Albums and artists lead with most-played for discovery; everything else is
    // already A–Z. The rail flips whichever it is to A–Z for the jump.
    const baseSortMode: CollectionItemSortMode =
        route.variant === 'album' || route.variant === 'artist' ? 'playCount' : 'alphabetical';

    const { jumpFeedbackLetter, letterIndex, listRef, onJumpToLetter, rows } = useAlphabetRail({
        baseSortMode,
        items: mergedItems,
        resetKey: route.variant,
    });

    const handleOpenContextMenu = useCallback(
        (item: MobileHomeItem) => contextMenu.openForItem(item),
        [contextMenu],
    );

    const renderRow = useCallback(
        ({ item: row }: { item: AlphabetRailRow }) => (
            <View style={styles.viewAllRow}>
                <ViewAllTile
                    item={row.left}
                    onOpenContextMenu={handleOpenContextMenu}
                    onSelectItem={onSelectItem}
                />
                {row.right ? (
                    <ViewAllTile
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
        <View style={styles.viewAllScreen}>
            <View style={styles.viewAllHeader}>
                <Pressable
                    accessibilityLabel="Back"
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={onBack}
                    style={styles.viewAllBackButton}
                >
                    <Text style={styles.viewAllBackArrow}>‹</Text>
                </Pressable>
                <Text numberOfLines={1} style={styles.viewAllTitle}>
                    {route.title}
                </Text>
                <View style={styles.viewAllBackButton} />
            </View>
            <View style={styles.viewAllBody}>
                {rows.length === 0 ? (
                    isLoading ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, width: '100%' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                                <View key={i} style={{ width: '45%' }}>
                                    <SkeletonTile />
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.viewAllEmpty}>
                            {isError ? 'Couldn’t load every item.' : 'Nothing to show here yet.'}
                        </Text>
                    )
                ) : (
                    <FlashList
                        {...chromeGlassScrollProps}
                        contentContainerStyle={[
                            styles.viewAllListContent,
                            { paddingBottom: bottomInset },
                        ]}
                        data={rows}
                        drawDistance={VIEW_ALL_ROW_HEIGHT * 8}
                        keyExtractor={keyExtractor}
                        maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                        ref={listRef}
                        renderItem={renderRow}
                        showsVerticalScrollIndicator={false}
                    />
                )}
                <AlphabetSidebar
                    activeLetters={letterIndex}
                    onJumpToLetter={onJumpToLetter}
                />
                {jumpFeedbackLetter ? (
                    <View pointerEvents="none" style={styles.viewAllJumpOverlay}>
                        <Text style={styles.viewAllJumpOverlayText}>
                            {jumpFeedbackLetter}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
});

ViewAllScreen.displayName = 'ViewAllScreen';

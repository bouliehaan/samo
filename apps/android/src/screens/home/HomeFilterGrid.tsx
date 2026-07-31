import { type ServerAuthenticationResult } from '@samo/core/server';
import { FlashList } from '@shopify/flash-list';
import { memo, type ReactElement, useCallback, useMemo } from 'react';
import {
    type RefreshControlProps,
    type ScrollViewProps,
    Text,
    View,
} from 'react-native';
import Reanimated from 'react-native-reanimated';

import { ArtworkImage } from '../../components/ArtworkImage';
import { PressableScale } from '../../components/PressableScale';
import { useMediaContextMenu } from '../../contexts/media-context-menu';
import { useScrollContentBottomInset } from '../../hooks/use-scroll-content-bottom-inset';
import { type AndroidRecentContentSourceItem } from '../../services/recent-content';
import { HOME_PRIMARY_TILE } from '../../theme/layout';
import { presses } from '../../theme/motion';
import { styles } from '../../theme/styles';
import { type SearchPullScrollProps } from '../../components/search-pull/useSearchPull';
import { getContentItemKey } from '../../utils/content-item';
import {
    androidTrimCaptionFont,
    FLASH_LIST_MAINTAIN_POSITION_DISABLED,
    getHomeItemSubtitle,
} from './shared';

const HomeFilterGridTile = memo(
    ({
        isPodcast,
        item,
        onPrefetchItem,
        onSelectItem,
        serverConnection,
        variant,
    }: {
        isPodcast: boolean;
        item: AndroidRecentContentSourceItem;
        onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
        onSelectItem: (item: AndroidRecentContentSourceItem) => void;
        serverConnection: ServerAuthenticationResult | null;
        variant: 'book' | 'podcast';
    }) => {
        const subtitle = getHomeItemSubtitle(item, variant);
        const contextMenu = useMediaContextMenu();

        return (
            <PressableScale
                {...presses.tile}
                // Long-press parity with HomeMediaTile — this wiring was verified
                // on-device (episode menu from the podcast pill grid) and then lost
                // in the June-20 tree churn; keep it with the tile.
                onLongPress={() => contextMenu.openForItem(item)}
                onPress={() => onSelectItem(item)}
                onPressIn={() => onPrefetchItem?.(item)}
                style={styles.homeFilterGridTile}
            >
                <ArtworkImage
                    artworkImageId={item.artworkImageId}
                    contentSource={item.source}
                    fallbackStyle={[
                        styles.homeFilterGridArtworkFallback,
                        isPodcast && styles.homeFilterGridArtworkPodcast,
                    ]}
                    letter={item.title.slice(0, 1)}
                    serverConnection={serverConnection}
                    style={[
                        styles.homeFilterGridArtwork,
                        isPodcast && styles.homeFilterGridArtworkPodcast,
                    ]}
                    uri={item.artworkUrl}
                />
                <Text numberOfLines={2} style={styles.mediaTitle} {...androidTrimCaptionFont}>
                    {item.title}
                </Text>
                {subtitle ? (
                    <View style={styles.homeFilterGridSubtitleRow}>
                        <Text
                            numberOfLines={1}
                            style={[styles.mediaSubtitle, androidTrimCaptionFont]}
                        >
                            {subtitle}
                        </Text>
                    </View>
                ) : null}
            </PressableScale>
        );
    },
);

HomeFilterGridTile.displayName = 'HomeFilterGridTile';

const HOME_GRID_COLUMNS = 2;

/** Animated host — the pull-down search's scroll handler runs on this list's
 *  UI thread (see useSearchPull). */
const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;

interface HomeGridRow {
    items: AndroidRecentContentSourceItem[];
    key: string;
}

/** Pack the grid items into fixed 2-up rows so a FlashList can virtualize them. */
const chunkHomeGridRows = (items: AndroidRecentContentSourceItem[]): HomeGridRow[] => {
    const rows: HomeGridRow[] = [];
    for (let index = 0; index < items.length; index += HOME_GRID_COLUMNS) {
        const rowItems = items.slice(index, index + HOME_GRID_COLUMNS);
        rows.push({ items: rowItems, key: rowItems.map(getContentItemKey).join('|') });
    }
    return rows;
};

export const HomeFilterGrid = memo(
    ({
        ListFooterComponent,
        ListHeaderComponent,
        items,
        onPrefetchItem,
        onSelectItem,
        refreshControl,
        renderScrollComponent,
        scrollProps,
        scrollRef,
        serverConnection,
        variant,
    }: {
        ListFooterComponent?: ReactElement | null;
        ListHeaderComponent?: ReactElement | null;
        items: AndroidRecentContentSourceItem[];
        onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
        onSelectItem: (item: AndroidRecentContentSourceItem) => void;
        refreshControl?: ReactElement<RefreshControlProps>;
        /** The pull-down search's inner scroll component, which binds the native
         *  scroll gesture so the pan runs alongside it (see useSearchPull). */
        renderScrollComponent?: (props: ScrollViewProps) => ReactElement;
        /** Host-owned scroll wiring for the pull-down search reveal. */
        scrollProps?: SearchPullScrollProps;
        scrollRef?: (
            node: {
                scrollToOffset?: (options: { animated?: boolean; offset: number }) => void;
            } | null,
        ) => void;
        serverConnection: ServerAuthenticationResult | null;
        variant: 'book' | 'podcast';
    }) => {
        const isPodcast = variant === 'podcast';
        const bottomInset = useScrollContentBottomInset();
        const rows = useMemo(() => chunkHomeGridRows(items), [items]);
        const renderRow = useCallback(
            ({ item: row }: { item: HomeGridRow }) => (
                <View style={styles.homeFilterGridRow}>
                    {row.items.map((item, column) => (
                        <HomeFilterGridTile
                            isPodcast={isPodcast}
                            item={item}
                            // COLUMN POSITION, NOT CONTENT — and this is the
                            // difference between recycling a cell and rebuilding
                            // it.
                            //
                            // FlashList v2 keeps the ViewHolder mounted and re-runs
                            // `renderItem` inside it (ViewHolder.children is a
                            // useMemo on `item`), so what React does next is
                            // decided entirely by the keys in this array. Keyed by
                            // content, a recycled row hands React two keys it has
                            // never seen: it unmounts both tiles and mounts two
                            // fresh ones. That tears down and rebuilds a
                            // GestureDetector with three native handlers, the
                            // Reanimated press styles, and — the expensive part —
                            // the ExpoImage view, which drops its decoded bitmap
                            // and restarts the Glide load from scratch. Every row,
                            // every time one scrolls past.
                            //
                            // Keyed by column, the same two tile instances survive
                            // and simply receive a new `item` prop, which is the
                            // entire point of a recycling list. Rows are a fixed
                            // two-up grid, so position is a stable identity.
                            key={column}
                            onPrefetchItem={onPrefetchItem}
                            onSelectItem={onSelectItem}
                            serverConnection={serverConnection}
                            variant={variant}
                        />
                    ))}
                    {/* Pad a final odd row so the lone tile keeps its column width. */}
                    {row.items.length < HOME_GRID_COLUMNS ? (
                        <View style={styles.homeFilterGridTile} />
                    ) : null}
                </View>
            ),
            [isPodcast, onPrefetchItem, onSelectItem, serverConnection, variant],
        );

        const list = (
            <ReanimatedFlashList
                ListFooterComponent={ListFooterComponent}
                ListHeaderComponent={ListHeaderComponent}
                contentContainerStyle={[styles.homeListContent, { paddingBottom: bottomInset }]}
                data={rows}
                // READ THIS AS A BUFFER OF `drawDistance * 2`, NOT AS ONE.
                // FlashList doubles the number and then splits it 70/30 in favour
                // of the scroll direction (EngagedIndicesTracker), so this is
                // ~490dp of rows pre-rendered ahead and ~210dp behind — a bit over
                // two rows ahead, which is what a fling needs.
                //
                // It was `HOME_PRIMARY_TILE * 6`, which reads like six tiles but is
                // 2088dp of buffer against an 855dp viewport: nearly 12 rows of
                // tiles mounted at once, every one of them decoding cover art, to
                // cover 3.6 rows of screen. Buffer is not free headroom — it is a
                // straight multiplier on every per-tile cost in this list.
                drawDistance={HOME_PRIMARY_TILE * 2}
                keyExtractor={(row) => row.key}
                maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                ref={scrollRef}
                refreshControl={refreshControl}
                renderItem={renderRow}
                renderScrollComponent={renderScrollComponent}
                showsVerticalScrollIndicator={false}
                style={styles.homeSceneRoot}
                {...scrollProps}
            />
        );
        // The pull pan no longer lives in the page (see SearchPullGestureHost),
        // so there is nothing left here to attach and no host view to force into
        // existence for it. `renderScrollComponent` still binds the scroller's
        // own native gesture to FlashList's real inner scroll view.
        return list;
    },
);

HomeFilterGrid.displayName = 'HomeFilterGrid';

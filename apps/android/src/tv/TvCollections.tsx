import { memo, type ReactElement, useCallback, useMemo, useRef } from 'react';
import { FlatList, Text, View } from 'react-native';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { type HomeDisplaySection } from '../types/home';
import { getContentItemKey } from '../utils/content-item';
import { getViewAllVariant } from '../utils/home-display';
import { didTvFocusArriveUp } from './tv-focus';
import { TvTile, TvViewAllTile } from './TvTile';
import { TV_GRID_COLUMNS, TV_SCROLL_EDGE, TV_SHELF_EDGE, tvStyles as s } from './tv-styles';

/**
 * How many tiles a shelf mounts. A shelf is a preview: past this the "View
 * All" tile opens the whole collection, virtualized, rather than every shelf
 * on the page mounting hundreds of covers the D-pad will never reach.
 */
const SHELF_TILE_LIMIT = 20;

/** A shelf the phone reserves space for while its live data arrives: the
 *  covers it will have, in place and at size. */
const TvPendingShelf = ({ section }: { section: HomeDisplaySection }) => {
    const wide = section.variant === 'wide' || section.variant === 'continue';
    return (
        <View style={s.shelf}>
            {section.title ? <Text style={s.sectionTitle}>{section.title}</Text> : null}
            <View style={[s.shelfScroll, s.shelfRow, s.pendingRow]}>
                {Array.from({ length: section.skeletonCount ?? 5 }, (_, index) => (
                    <View
                        key={index}
                        style={[wide ? s.pendingTileWide : s.tileArt, s.pendingTile]}
                    />
                ))}
            </View>
        </View>
    );
};

/**
 * One of the phone's Home rows: its title, its covers left to right, and — for
 * the kinds the phone offers "View All" on — a last tile that opens the rest.
 */
export const TvShelf = memo(function TvShelf({
    allowRemoveFromHome,
    section,
}: {
    allowRemoveFromHome?: boolean;
    section: HomeDisplaySection;
}) {
    if (section.pending) {
        return <TvPendingShelf section={section} />;
    }
    const canViewAll = getViewAllVariant(section.variant) !== null;
    const items =
        canViewAll && section.items.length > SHELF_TILE_LIMIT
            ? section.items.slice(0, SHELF_TILE_LIMIT)
            : section.items;
    return (
        <View style={s.shelf}>
            {section.title ? <Text style={s.sectionTitle}>{section.title}</Text> : null}
            <FlatList
                contentContainerStyle={s.shelfRow}
                data={items}
                fadingEdgeLength={{ start: 0, end: TV_SHELF_EDGE }}
                horizontal
                initialNumToRender={6}
                keyExtractor={getContentItemKey}
                maxToRenderPerBatch={3}
                removeClippedSubviews={false}
                showsHorizontalScrollIndicator={false}
                style={s.shelfScroll}
                windowSize={3}
                renderItem={({ item, index }) => {
                    const key = getContentItemKey(item);
                    return (
                        <TvTile
                            allowRemoveFromHome={allowRemoveFromHome}
                            focusId={`${section.key}:${key}`}
                            item={item}
                            last={!canViewAll && index === items.length - 1}
                            variant={section.variant}
                        />
                    );
                }}
                ListFooterComponent={
                    canViewAll ? (
                        <TvViewAllTile focusId={`${section.key}:view-all`} section={section} />
                    ) : null
                }
            />
        </View>
    );
});

/** The focus id of a grid's first tile, for a page to place focus on. */
export const getTvGridFocusId = (idPrefix: string, item: AndroidRecentContentSourceItem) =>
    `${idPrefix}:${getContentItemKey(item)}`;

type GridRow = AndroidRecentContentSourceItem[];

/**
 * A whole collection as rows of covers, virtualized — only rows near the
 * screen mount. Clipped rows stay attached (`removeClippedSubviews` off) so the
 * D-pad can always find the row below before the list has scrolled to it.
 */
export const TvGrid = memo(function TvGrid({
    footer,
    header,
    idPrefix,
    items,
    variant,
}: {
    footer?: ReactElement | null;
    header?: ReactElement | null;
    idPrefix: string;
    items: AndroidRecentContentSourceItem[];
    variant: HomeDisplaySection['variant'];
}) {
    const list = useRef<FlatList<GridRow>>(null);
    // The top row brings the page's header back with it: a plain scroll would
    // stop with the row at the edge margin, and the title cut off above.
    const revealTop = useCallback(() => {
        if (didTvFocusArriveUp()) list.current?.scrollToOffset({ animated: true, offset: 0 });
    }, []);
    const rows = useMemo(() => {
        const chunked: GridRow[] = [];
        for (let index = 0; index < items.length; index += TV_GRID_COLUMNS) {
            chunked.push(items.slice(index, index + TV_GRID_COLUMNS));
        }
        return chunked;
    }, [items]);
    return (
        <FlatList
            contentContainerStyle={s.pageScroll}
            data={rows}
            fadingEdgeLength={{ start: 0, end: TV_SCROLL_EDGE }}
            initialNumToRender={3}
            // Rows are slots, not content: a re-sort hands a row new tiles
            // (which key themselves) instead of remounting every row.
            keyExtractor={(_row, index) => String(index)}
            ListFooterComponent={footer}
            ListHeaderComponent={header}
            maxToRenderPerBatch={2}
            ref={list}
            removeClippedSubviews={false}
            renderItem={({ item: row, index }) => (
                <View style={s.gridRow}>
                    {row.map((item, column) => (
                        <TvTile
                            focusId={getTvGridFocusId(idPrefix, item)}
                            item={item}
                            key={getContentItemKey(item)}
                            last={column === row.length - 1}
                            onFocus={index === 0 ? revealTop : undefined}
                            variant={variant}
                        />
                    ))}
                </View>
            )}
            showsVerticalScrollIndicator={false}
            windowSize={5}
        />
    );
});

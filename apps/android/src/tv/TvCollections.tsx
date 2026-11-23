import { memo, type ReactElement, useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { colors } from '../theme/tokens';
import { type HomeDisplaySection } from '../types/home';
import { getContentItemKey } from '../utils/content-item';
import { getViewAllVariant } from '../utils/home-display';
import { TvFocusGroup } from './TvFocusGroup';
import { isTvWideVariant, TvTile, TvViewAllTile } from './TvTile';
import {
    TV_ANCHOR_TOP,
    TV_GRID_ANCHOR_Y,
    TV_GRID_COLUMNS,
    TV_GUTTER,
    TV_LIST_PROPS,
    TV_SHELF_ANCHOR_Y,
    TV_TILE,
    TV_TILE_GAP,
    TV_WIDE_TILE,
    tvStyles as s,
} from './tv-styles';

/**
 * How many tiles a shelf mounts. A shelf is a preview: past this the "View
 * All" tile opens the whole collection, virtualized, rather than every shelf
 * on the page mounting hundreds of covers the D-pad will never reach.
 */
const SHELF_TILE_LIMIT = 20;

const TOP_FADE = [colors.background, colors.background, 'rgba(14, 15, 19, 0)'];
/** Solid across most of the overscan and gone by its edge, where a focused
 *  row's title or ring begins. */
const TOP_FADE_STOPS = [0, 0.6, 1];

/**
 * Over the top of a page that scrolls to the screen's edge: rows that have
 * scrolled up leave through it, rather than a line of their titles being left
 * showing in the overscan.
 */
export const TvTopFade = () => (
    <LinearGradient
        colors={TOP_FADE}
        locations={TOP_FADE_STOPS}
        pointerEvents="none"
        style={s.topFade}
    />
);

/** A shelf the phone reserves space for while its live data arrives: the
 *  covers it will have, in place and at size. */
const TvPendingShelf = ({ section }: { section: HomeDisplaySection }) => {
    const wide = isTvWideVariant(section.variant);
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
 *
 * The row moves, focus does not: each cover focus reaches glides to the page's
 * keyline, where the row's title starts, and the ones before it slide out
 * under the rail. Moving down a page does the same with the rows themselves.
 */
export const TvShelf = memo(function TvShelf({
    allowRemoveFromHome,
    anchorY = TV_SHELF_ANCHOR_Y,
    section,
}: {
    allowRemoveFromHome?: boolean;
    /** Where focus brings the covers in the page's list (`TV_SHELF_ANCHOR_Y`). */
    anchorY?: number;
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
    const step = (isTvWideVariant(section.variant) ? TV_WIDE_TILE : TV_TILE) + TV_TILE_GAP;
    return (
        <View style={s.shelf}>
            {section.title ? <Text style={s.sectionTitle}>{section.title}</Text> : null}
            <TvFocusGroup entryInset={TV_GUTTER} style={s.shelfScroll}>
                <FlatList
                    contentContainerStyle={s.shelfRow}
                    data={items}
                    // Every tile is one width: nothing to measure, and the window
                    // is known before anything in it has been laid out.
                    getItemLayout={(_data, index) => ({
                        index,
                        length: step,
                        offset: TV_GUTTER + step * index,
                    })}
                    horizontal
                    initialNumToRender={6}
                    keyExtractor={getContentItemKey}
                    // The covers after the first screen arrive while focus is
                    // moving, so one at a time: each is a few views and a
                    // decode to mount (4-5ms on an emulator), and four at once
                    // was a frame the onn box drops two or three of.
                    maxToRenderPerBatch={1}
                    {...TV_LIST_PROPS}
                    windowSize={3}
                    renderItem={({ item, index }) => (
                        <TvTile
                            allowRemoveFromHome={allowRemoveFromHome}
                            anchorX={TV_GUTTER}
                            anchorY={anchorY}
                            focusId={`${section.key}:${getContentItemKey(item)}`}
                            item={item}
                            last={!canViewAll && index === items.length - 1}
                            variant={section.variant}
                        />
                    )}
                    ListFooterComponent={
                        canViewAll ? (
                            <TvViewAllTile
                                anchorX={TV_GUTTER}
                                anchorY={anchorY}
                                focusId={`${section.key}:view-all`}
                                section={section}
                            />
                        ) : null
                    }
                />
            </TvFocusGroup>
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
 *
 * The row focus is on rides just under the top of the screen, with the next
 * one whole beneath it; the first brings the page's header back with it.
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
    const rows = useMemo(() => {
        const chunked: GridRow[] = [];
        for (let index = 0; index < items.length; index += TV_GRID_COLUMNS) {
            chunked.push(items.slice(index, index + TV_GRID_COLUMNS));
        }
        return chunked;
    }, [items]);
    return (
        <>
            <FlatList
                contentContainerStyle={s.pageScroll}
                data={rows}
                initialNumToRender={3}
                // Rows are slots, not content: a re-sort hands a row new tiles
                // (which key themselves) instead of remounting every row.
                keyExtractor={(_row, index) => String(index)}
                ListFooterComponent={footer}
                ListHeaderComponent={header}
                // A row is five covers to mount (see TvShelf's batch); two rows
                // in one go is ten, mounted in a single frame.
                maxToRenderPerBatch={1}
                {...TV_LIST_PROPS}
                renderItem={({ item: row, index }) => (
                    <View style={s.gridRow}>
                        {row.map((item, column) => (
                            <TvTile
                                anchorY={index === 0 ? TV_ANCHOR_TOP : TV_GRID_ANCHOR_Y}
                                focusId={getTvGridFocusId(idPrefix, item)}
                                item={item}
                                key={getContentItemKey(item)}
                                last={column === row.length - 1}
                                variant={variant}
                            />
                        ))}
                    </View>
                )}
                windowSize={5}
            />
            <TvTopFade />
        </>
    );
});

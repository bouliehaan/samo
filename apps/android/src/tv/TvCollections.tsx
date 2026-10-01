import { memo, type ReactElement, useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { type HomeDisplaySection } from '../types/home';
import { getContentItemKey } from '../utils/content-item';
import { getViewAllVariant } from '../utils/home-display';
import { TvTile, TvViewAllTile } from './TvTile';
import { TV_GRID_COLUMNS, tvStyles as s } from './tv-styles';

/**
 * How many tiles a shelf mounts. A shelf is a preview: past this the "View
 * All" tile opens the whole collection, virtualized, rather than every shelf
 * on the page mounting hundreds of covers the D-pad will never reach.
 */
const SHELF_TILE_LIMIT = 20;

const PENDING_TILES = [0, 1, 2, 3, 4];

/** A shelf the phone reserves space for while its live data arrives. */
const TvPendingShelf = ({ title }: { title: string }) => (
    <View style={s.shelf}>
        {title ? <Text style={s.sectionTitle}>{title}</Text> : null}
        <View style={[s.shelfRow, { flexDirection: 'row' }]}>
            {PENDING_TILES.map((index) => (
                <View key={index} style={[s.tileArt, { opacity: 0.5 }]} />
            ))}
        </View>
    </View>
);

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
        return <TvPendingShelf title={section.title} />;
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
                horizontal
                initialNumToRender={6}
                keyExtractor={getContentItemKey}
                maxToRenderPerBatch={3}
                removeClippedSubviews={false}
                showsHorizontalScrollIndicator={false}
                style={s.shelfScroll}
                windowSize={3}
                renderItem={({ item }) => {
                    const key = getContentItemKey(item);
                    return (
                        <TvTile
                            allowRemoveFromHome={allowRemoveFromHome}
                            focusId={`${section.key}:${key}`}
                            item={item}
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
            initialNumToRender={3}
            // Rows are slots, not content: a re-sort hands a row new tiles
            // (which key themselves) instead of remounting every row.
            keyExtractor={(_row, index) => String(index)}
            ListFooterComponent={footer}
            ListHeaderComponent={header}
            maxToRenderPerBatch={2}
            removeClippedSubviews={false}
            renderItem={({ item: row }) => (
                <View style={s.gridRow}>
                    {row.map((item) => (
                        <TvTile
                            focusId={getTvGridFocusId(idPrefix, item)}
                            item={item}
                            key={getContentItemKey(item)}
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

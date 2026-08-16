import { ReactElement, useMemo } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List, RowComponentProps } from 'react-window-v2';

import { LongFormCard, LongFormMediaKind } from './long-form-card';
import styles from './long-form-grid.module.css';

import { virtualListStyle } from '/@/renderer/utils/virtual-list-style';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

/** Tile sizing. Column count is derived from available width, not hardcoded. */
const MIN_TILE_WIDTH = 170;
const GAP = 20;
/** Square cover + up to three text lines. */
const TEXT_BLOCK_HEIGHT = 62;

export interface LongFormGridDescriptor {
    subtitle?: string;
    tertiary?: string;
    title: string;
}

interface LongFormGridProps {
    describe: (item: LongFormLibraryItem) => LongFormGridDescriptor;
    items: LongFormLibraryItem[];
    kind: LongFormMediaKind;
    onOpen: (item: LongFormLibraryItem) => void;
    server: null | ServerListItemWithCredential | undefined;
}

interface RowData {
    columnCount: number;
    describe: LongFormGridProps['describe'];
    items: LongFormLibraryItem[];
    kind: LongFormMediaKind;
    onOpen: LongFormGridProps['onOpen'];
    server: LongFormGridProps['server'];
}

const GridRow = ({
    columnCount,
    describe,
    index,
    items,
    kind,
    onOpen,
    server,
    style,
}: RowComponentProps<RowData>) => {
    const start = index * columnCount;
    const rowItems = items.slice(start, start + columnCount);

    return (
        <div
            className={styles.row}
            style={{ ...style, gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
            {rowItems.map((item) => {
                const descriptor = describe(item);
                return (
                    <LongFormCard
                        item={item}
                        key={item.id}
                        kind={kind}
                        onOpen={onOpen}
                        server={server}
                        subtitle={descriptor.subtitle}
                        tertiary={descriptor.tertiary}
                        title={descriptor.title}
                    />
                );
            })}
        </div>
    );
};

/**
 * Virtualized library grid for long-form items.
 *
 * The previous audiobook/podcast grids rendered every tile in the library at
 * once. Tiles are cover-bearing, and cover decode is the expensive part of a
 * dense grid, so an unvirtualized grid pays for the whole library up front
 * regardless of what is on screen.
 */
export const LongFormGrid = ({ describe, items, kind, onOpen, server }: LongFormGridProps) => {
    return (
        <div className={styles.container}>
            <AutoSizer>
                {({ height, width }) => {
                    if (!height || !width) return null;

                    const columnCount = Math.max(
                        1,
                        Math.floor((width + GAP) / (MIN_TILE_WIDTH + GAP)),
                    );
                    const tileWidth = (width - GAP * (columnCount - 1)) / columnCount;
                    const rowHeight = Math.round(tileWidth + TEXT_BLOCK_HEIGHT + GAP);
                    const rowCount = Math.ceil(items.length / columnCount);

                    return (
                        <List
                            rowComponent={
                                GridRow as (props: RowComponentProps<RowData>) => ReactElement
                            }
                            rowCount={rowCount}
                            rowHeight={rowHeight}
                            rowProps={{ columnCount, describe, items, kind, onOpen, server }}
                            style={virtualListStyle(height, width)}
                        />
                    );
                }}
            </AutoSizer>
        </div>
    );
};

/** Case-insensitive substring filter over a caller-supplied haystack. */
export const useFilteredLongFormItems = (
    items: LongFormLibraryItem[],
    query: string,
    toSearchText: (item: LongFormLibraryItem) => string,
) =>
    useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return items;
        return items.filter((item) => toSearchText(item).includes(needle));
    }, [items, query, toSearchText]);

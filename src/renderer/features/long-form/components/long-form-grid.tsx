import { CSSProperties, RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { LongFormCard, LongFormMediaKind } from './long-form-card';
import styles from './long-form-grid.module.css';

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
    scrollRef: RefObject<HTMLDivElement | null>;
    server: null | ServerListItemWithCredential | undefined;
}

interface RowData {
    columnCount: number;
    describe: LongFormGridProps['describe'];
    index: number;
    items: LongFormLibraryItem[];
    kind: LongFormMediaKind;
    onOpen: LongFormGridProps['onOpen'];
    server: LongFormGridProps['server'];
    style: CSSProperties;
}

const GridRow = ({ columnCount, describe, index, items, kind, onOpen, server, style }: RowData) => {
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

/** Virtualize against the page viewport so shelves and catalog share one scrollbar. */
export const LongFormGrid = ({
    describe,
    items,
    kind,
    onOpen,
    scrollRef,
    server,
}: LongFormGridProps) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState({ height: 0, top: 0, width: 0 });

    useEffect(() => {
        const grid = gridRef.current;
        const page = scrollRef.current;
        if (!grid || !page) return;

        const measure = () => {
            const next = {
                height: page.clientHeight,
                top:
                    page.getBoundingClientRect().top +
                    page.clientTop -
                    grid.getBoundingClientRect().top,
                width: grid.clientWidth,
            };
            setViewport((previous) =>
                previous.height === next.height &&
                previous.top === next.top &&
                previous.width === next.width
                    ? previous
                    : next,
            );
        };
        const observer = new ResizeObserver(measure);
        observer.observe(page);
        observer.observe(grid);
        // Shelf content can arrive asynchronously and change the grid's offset.
        if (grid.parentElement) observer.observe(grid.parentElement);
        page.addEventListener('scroll', measure, { passive: true });
        measure();

        return () => {
            observer.disconnect();
            page.removeEventListener('scroll', measure);
        };
    }, [items, scrollRef]);

    const columnCount = Math.max(1, Math.floor((viewport.width + GAP) / (MIN_TILE_WIDTH + GAP)));
    const tileWidth = (viewport.width - GAP * (columnCount - 1)) / columnCount;
    const rowHeight = Math.round(tileWidth + TEXT_BLOCK_HEIGHT + GAP);
    const rowCount = Math.ceil(items.length / columnCount);
    const start = Math.min(rowCount, Math.max(0, Math.floor(viewport.top / rowHeight) - 2));
    const end = Math.min(
        rowCount,
        Math.max(start, Math.ceil((viewport.top + viewport.height) / rowHeight) + 2),
    );

    return (
        <div className={styles.container} ref={gridRef} style={{ height: rowCount * rowHeight }}>
            {viewport.width > 0 &&
                Array.from({ length: end - start }, (_, offset) => {
                    const index = start + offset;
                    return (
                        <GridRow
                            columnCount={columnCount}
                            describe={describe}
                            index={index}
                            items={items}
                            key={index}
                            kind={kind}
                            onOpen={onOpen}
                            server={server}
                            style={{ height: rowHeight, top: index * rowHeight }}
                        />
                    );
                })}
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

/**
 * The grid's scroll arithmetic, kept pure and separately tested.
 *
 * This exists because of the react-window v1 -> v2 migration. v1 handed the
 * component `initialScrollOffset`, a `scrollDirection` on every scroll event,
 * and `scrollToItem`/`scrollTo` imperatives. v2 provides none of those: the
 * list is driven through its own DOM element instead. That moved four pieces of
 * arithmetic out of the library and into this codebase, and every one of them
 * silently backs a user-visible behaviour — restoring scroll position when you
 * navigate back to a browse page, and reporting the visible range to the
 * infinite loader so it knows when to fetch.
 *
 * None of it had test coverage under v1 because the library owned it. It does
 * now, so it is isolated here rather than buried in a 900-line component.
 */

export type GridInitialTop = {
    to: number;
    type: 'index' | 'offset';
};

export type GridScrollDirection = 'down' | 'up';

/**
 * Which grid row an item index falls in.
 *
 * `columnCount` is clamped to at least 1: it is derived from a measured
 * container width, and is 0 before the first measurement lands. Dividing by
 * that yields Infinity, and an Infinity row index scrolls the list to nowhere.
 */
export const rowForIndex = (index: number, columnCount: number): number =>
    Math.floor(index / Math.max(1, columnCount));

/**
 * Convert a rendered ROW range into the ITEM range the infinite loader wants.
 *
 * The grid virtualizes rows, but consumers page over items, so a visible span
 * of rows 2-4 across 5 columns means items 10-24. The stop index is the LAST
 * item of the stop row, not the first — using the first (as `stopIndex *
 * columnCount` alone would) under-reports the range by up to one full row and
 * makes the loader fetch a page late.
 */
export const itemRangeForRows = (
    visibleRows: { startIndex: number; stopIndex: number },
    columnCount: number,
    itemCount: number,
): { startIndex: number; stopIndex: number } => {
    const columns = Math.max(1, columnCount);
    const startIndex = visibleRows.startIndex * columns;
    const stopIndex = Math.min(itemCount - 1, (visibleRows.stopIndex + 1) * columns - 1);

    return { startIndex, stopIndex: Math.max(startIndex, stopIndex) };
};

/**
 * The scroll offset a freshly-mounted grid should start at.
 *
 * A defined `currentPage` means the list is paginated, and every page change
 * except the first must land at the top — otherwise page 2 opens halfway down
 * because page 1 happened to be scrolled there.
 */
export const resolveInitialScrollOffset = ({
    columnCount,
    currentPage,
    initialTop,
    itemHeight,
}: {
    columnCount: number;
    currentPage?: number;
    initialTop?: GridInitialTop;
    itemHeight: number;
}): number => {
    const isPaginatedNonFirstPage = currentPage !== undefined && currentPage !== 0;

    if (isPaginatedNonFirstPage || !initialTop) {
        return 0;
    }

    if (initialTop.type === 'offset') {
        return initialTop.to;
    }

    return rowForIndex(initialTop.to, columnCount) * itemHeight;
};

/**
 * Scroll direction from two successive offsets.
 *
 * react-window v1 supplied this on its scroll event; reading a DOM `scroll`
 * event does not, so it is derived. A scroll event that reports no movement
 * keeps the previous direction rather than inventing one — matching v1, which
 * held its last `scrollDirection` and started at 'forward'.
 */
export const resolveScrollDirection = (
    previousOffset: number,
    nextOffset: number,
    previousDirection: GridScrollDirection = 'down',
): GridScrollDirection => {
    if (nextOffset > previousOffset) {
        return 'down';
    }

    if (nextOffset < previousOffset) {
        return 'up';
    }

    return previousDirection;
};

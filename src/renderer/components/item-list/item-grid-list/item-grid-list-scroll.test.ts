import { describe, expect, it } from 'vitest';

import {
    itemRangeForRows,
    resolveInitialScrollOffset,
    resolveScrollDirection,
    rowForIndex,
} from './item-grid-list-scroll';

describe('rowForIndex', () => {
    it('maps an item index onto its grid row', () => {
        expect(rowForIndex(0, 5)).toBe(0);
        expect(rowForIndex(4, 5)).toBe(0);
        expect(rowForIndex(5, 5)).toBe(1);
        expect(rowForIndex(13, 5)).toBe(2);
    });

    it('survives a column count of zero', () => {
        // columnCount comes from a measured container width and is 0 until the
        // first measurement lands. Dividing by it yields Infinity, and scrolling
        // to row Infinity puts the grid nowhere.
        expect(rowForIndex(42, 0)).toBe(42);
        expect(Number.isFinite(rowForIndex(42, 0))).toBe(true);
    });
});

describe('itemRangeForRows', () => {
    it('reports the full span of items covered by the visible rows', () => {
        // Rows 0-2 across 5 columns is items 0-14, NOT 0-10.
        //
        // react-window v1's handler computed the stop index as
        // `visibleStopIndex * columnCount`, which is the FIRST item of the stop
        // row rather than the last — under-reporting the visible range by up to
        // one row short of a full row. The infinite loader derives
        // `distanceToEndBoundary = endPageBoundary - stopIndex` from this to
        // decide when to prefetch, so an under-reported stop index made every
        // grid fetch its next page later than intended.
        expect(itemRangeForRows({ startIndex: 0, stopIndex: 2 }, 5, 1000)).toEqual({
            startIndex: 0,
            stopIndex: 14,
        });
    });

    it('offsets the start index by the column count', () => {
        expect(itemRangeForRows({ startIndex: 3, stopIndex: 4 }, 7, 1000)).toEqual({
            startIndex: 21,
            stopIndex: 34,
        });
    });

    it('clamps the stop index to the last real item', () => {
        // A partially-filled final row must not report indexes past the data.
        expect(itemRangeForRows({ startIndex: 0, stopIndex: 2 }, 5, 12)).toEqual({
            startIndex: 0,
            stopIndex: 11,
        });
    });

    it('never returns a stop index below the start index', () => {
        expect(itemRangeForRows({ startIndex: 4, stopIndex: 4 }, 5, 3)).toEqual({
            startIndex: 20,
            stopIndex: 20,
        });
    });

    it('survives a column count of zero', () => {
        expect(itemRangeForRows({ startIndex: 0, stopIndex: 0 }, 0, 10)).toEqual({
            startIndex: 0,
            stopIndex: 0,
        });
    });
});

describe('resolveInitialScrollOffset', () => {
    it('starts at the top when there is nothing to restore', () => {
        expect(resolveInitialScrollOffset({ columnCount: 5, itemHeight: 200 })).toBe(0);
    });

    it('restores a raw pixel offset as-is', () => {
        expect(
            resolveInitialScrollOffset({
                columnCount: 5,
                initialTop: { to: 1234, type: 'offset' },
                itemHeight: 200,
            }),
        ).toBe(1234);
    });

    it('converts a restored item index into the offset of its row', () => {
        // Item 13 across 5 columns is row 2, so 2 * 200px.
        expect(
            resolveInitialScrollOffset({
                columnCount: 5,
                initialTop: { to: 13, type: 'index' },
                itemHeight: 200,
            }),
        ).toBe(400);
    });

    it('restores position on the first page of a paginated list', () => {
        expect(
            resolveInitialScrollOffset({
                columnCount: 5,
                currentPage: 0,
                initialTop: { to: 900, type: 'offset' },
                itemHeight: 200,
            }),
        ).toBe(900);
    });

    it('lands at the top on every other page of a paginated list', () => {
        // Otherwise page 2 opens halfway down because page 1 was scrolled there.
        expect(
            resolveInitialScrollOffset({
                columnCount: 5,
                currentPage: 1,
                initialTop: { to: 900, type: 'offset' },
                itemHeight: 200,
            }),
        ).toBe(0);
    });
});

describe('resolveScrollDirection', () => {
    it('reads a growing offset as scrolling down', () => {
        expect(resolveScrollDirection(100, 250)).toBe('down');
    });

    it('reads a shrinking offset as scrolling up', () => {
        expect(resolveScrollDirection(250, 100)).toBe('up');
    });

    it('holds the previous direction when the offset does not move', () => {
        // react-window v1 held its last scrollDirection rather than resetting,
        // and defaulted to 'forward' (down) before any movement.
        expect(resolveScrollDirection(100, 100, 'up')).toBe('up');
        expect(resolveScrollDirection(100, 100)).toBe('down');
    });
});

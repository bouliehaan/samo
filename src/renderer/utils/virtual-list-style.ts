import { type CSSProperties } from 'react';

/**
 * The style a react-window `List` needs when its size comes from AutoSizer.
 *
 * react-window v2 sizes itself to its parent by default: it sets
 * `max-height: 100%`, `max-width: 100%` and `flex-grow: 1` on its own element,
 * which is right when you drop it into a container that already has a size.
 *
 * `react-virtualized-auto-sizer` works the opposite way round. It measures its
 * PARENT and renders the list inside its own deliberately zero-sized div
 * (`height: 0; width: 0`) so that its presence cannot influence the
 * measurement. Put the two together and react-window's percentage caps resolve
 * against that zero: `max-height: 100%` becomes `max-height: 0`, the list
 * clamps to nothing regardless of the explicit pixel height it was given, and
 * its `overflow: auto` then clips every row. The list renders, the rows are in
 * the DOM with correct geometry, and the page looks empty — which is exactly
 * how this presented on the album, audiobook and podcast grids.
 *
 * So when the caller supplies real pixel dimensions, the percentage caps are
 * not just redundant, they are measured against the wrong box. Clearing them is
 * what makes the explicit size authoritative.
 */
export const virtualListStyle = (height: number, width: number): CSSProperties => ({
    height,
    maxHeight: 'none',
    maxWidth: 'none',
    width,
});

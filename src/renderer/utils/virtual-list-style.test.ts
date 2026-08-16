import { describe, expect, it } from 'vitest';

import { virtualListStyle } from '/@/renderer/utils/virtual-list-style';

describe('virtualListStyle', () => {
    it('passes the measured pixel size through', () => {
        expect(virtualListStyle(859, 1238)).toMatchObject({ height: 859, width: 1238 });
    });

    it('clears the percentage caps react-window sets on itself', () => {
        // Without these, `max-height: 100%` resolves against AutoSizer's
        // zero-height measuring div and collapses the list to nothing.
        expect(virtualListStyle(859, 1238)).toMatchObject({
            maxHeight: 'none',
            maxWidth: 'none',
        });
    });

    it('does not special-case a zero measurement', () => {
        // Callers decide whether a zero size is worth rendering; this only
        // describes the style.
        expect(virtualListStyle(0, 0)).toMatchObject({ height: 0, width: 0 });
    });
});

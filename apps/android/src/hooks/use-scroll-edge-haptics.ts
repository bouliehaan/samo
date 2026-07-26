import { useCallback } from 'react';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import { triggerImpact } from '../services/haptics';

/**
 * Within this many px of an end, the list counts as having arrived there.
 * Over-scroll is off app-wide (`overScrollMode: 'never'`), so the offset really
 * does clamp at 0 and at max — this only absorbs sub-pixel rounding.
 */
const EDGE_EPSILON = 2;

/**
 * How fast the list must be travelling for an arrival to be worth feeling, in
 * px per scroll event. At `scrollEventThrottle: 16` that is roughly one frame,
 * so 20px/frame ≈ 1200px/s.
 *
 * The gate is the whole point. A detent fires when the list SLAMS into an end —
 * that is the physical event, the thing a real mechanism would let you feel.
 * Deliberately creeping to the last row is not an impact, and buzzing for it
 * would make the gesture feel nervous rather than solid.
 */
const MIN_ARRIVAL_SPEED = 20;

/**
 * The detent you feel when a fling hits the top or the bottom of a page.
 *
 * Returns a worklet to call from inside an existing `useAnimatedScrollHandler`,
 * rather than a handler of its own — every scrolling surface here already owns
 * one (the pull-down search reads the offset from it), and two animated scroll
 * handlers cannot both be attached to one scroll view.
 *
 * Everything runs on the UI thread. The only cross-thread hop is the haptic
 * itself, which fires on the CROSSING — latched on arrival, re-armed on
 * leaving — so it costs one `runOnJS` per impact rather than one per frame.
 */
export function useScrollEdgeHaptics(): (
    offsetY: number,
    contentHeight: number,
    layoutHeight: number,
) => void {
    const lastOffset = useSharedValue(0);
    const lastDelta = useSharedValue(0);
    // Starts latched: a page opens already at the top, and that is an arrival
    // nobody made — firing there would buzz on every mount.
    const isAtEdge = useSharedValue(true);

    return useCallback(
        (offsetY: number, contentHeight: number, layoutHeight: number) => {
            'worklet';
            const delta = offsetY - lastOffset.value;
            const previousDelta = lastDelta.value;
            lastOffset.value = offsetY;
            lastDelta.value = delta;

            const maxOffset = contentHeight - layoutHeight;
            const atTop = offsetY <= EDGE_EPSILON;
            // A page shorter than its viewport is at both ends at once; it has
            // no bottom to hit, so only the top counts.
            const atBottom =
                maxOffset > EDGE_EPSILON && offsetY >= maxOffset - EDGE_EPSILON;

            if (!atTop && !atBottom) {
                isAtEdge.value = false;
                return;
            }
            if (isAtEdge.value) {
                return;
            }
            isAtEdge.value = true;

            // The frame that lands ON the end is already clamped, so its own
            // delta is only the few px that were left — it under-reports the
            // impact badly on a hard fling. The frame BEFORE it carries the
            // real speed, so take whichever is larger.
            const arrivalSpeed = Math.max(Math.abs(delta), Math.abs(previousDelta));
            if (arrivalSpeed >= MIN_ARRIVAL_SPEED) {
                runOnJS(triggerImpact)('light');
            }
        },
        [isAtEdge, lastDelta, lastOffset],
    );
}

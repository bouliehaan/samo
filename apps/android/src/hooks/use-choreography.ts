import { useEffect } from 'react';
import { type SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { CHOREOGRAPHY_EASING, CHOREOGRAPHY_MS } from '../theme/choreography';
import { useReducedMotionPreference } from './use-reduced-motion-preference';

/**
 * The single clock behind one surface's choreographed entrance.
 *
 * Returns a shared value running 0→1 exactly once, which every part of the
 * surface reads through `stage()` / `cascadeWindow()` to find its own slice.
 * One driver, any number of parts — see theme/choreography.ts for why that
 * matters more than it looks.
 *
 * `key` restarts the clock. Pass whatever identifies the CONTENT (a detail id,
 * a route) so navigating from one album to another re-runs the assembly on the
 * new material, while a re-render for any other reason — a favourite toggling,
 * a download landing, a store update — leaves an in-flight or finished
 * entrance completely alone. Restarting on every render would put the screen
 * in a permanent shimmer.
 */
export function useChoreography(key?: number | string): SharedValue<number> {
    const reducedMotion = useReducedMotionPreference();
    const clock = useSharedValue(0);

    useEffect(() => {
        if (reducedMotion) {
            clock.value = 1;
            return;
        }
        // Snap to 0 before running, so a re-key mid-flight restarts cleanly
        // rather than easing from wherever the last one had reached.
        clock.value = 0;
        clock.value = withTiming(1, {
            duration: CHOREOGRAPHY_MS,
            easing: CHOREOGRAPHY_EASING,
        });
    }, [clock, key, reducedMotion]);

    return clock;
}

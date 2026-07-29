import { useEffect, useId } from 'react';
import { type SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { beginChromeGlassMotion, endChromeGlassMotion } from '../state/chrome-glass';
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
    // Distinct per clock instance, so two overlapping entrances cannot release
    // each other's glass hold.
    const glassKey = `choreography:${useId()}`;

    useEffect(() => {
        if (reducedMotion) {
            clock.value = 1;
            return;
        }
        /*
         * Hold the chrome glass for the length of the assembly.
         *
         * This is the single most expensive moment in the app for it: a detail
         * entrance animates the hero AND every mounted row off one clock, so
         * every frame of it redraws the largest view tree the app ever has —
         * and a live `dimezisBlurView` charges a full software redraw of that
         * tree, twice, on top of each of those frames (state/chrome-glass).
         *
         * Released here rather than on the timing's completion callback, for
         * the same reason TabSceneContainer rests on a timeout: `runOnJS` lands
         * asynchronously, so a stale completion could release a hold a NEWER
         * entrance had just taken. The cleanup cancels this synchronously on
         * re-key, and `endChromeGlassMotion` is keyed and idempotent besides.
         */
        beginChromeGlassMotion(glassKey);
        // Snap to 0 before running, so a re-key mid-flight restarts cleanly
        // rather than easing from wherever the last one had reached.
        clock.value = 0;
        clock.value = withTiming(1, {
            duration: CHOREOGRAPHY_MS,
            easing: CHOREOGRAPHY_EASING,
        });
        const done = setTimeout(() => endChromeGlassMotion(glassKey), CHOREOGRAPHY_MS);
        return () => {
            clearTimeout(done);
            endChromeGlassMotion(glassKey);
        };
    }, [clock, glassKey, key, reducedMotion]);

    return clock;
}

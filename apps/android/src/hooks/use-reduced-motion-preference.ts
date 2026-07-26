import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The OS "Remove animations" setting, as ONE module-level subscription shared
 * by every consumer — the same module-singleton shape as the navigation and
 * tab-reselect stores.
 *
 * This used to be per-component `useState` + its own `addEventListener`. That
 * was fine at two consumers and wrong at twenty: every animated surface in the
 * app needs this value, and the per-component version meant N live
 * AccessibilityInfo listeners, N async `isReduceMotionEnabled()` round trips on
 * mount, and — the actual bug — N INDEPENDENT first paints, because each
 * consumer starts at `false` and flips only when its own promise lands. Two
 * surfaces animating in together could disagree about whether motion was even
 * allowed.
 *
 * One module value, resolved once, means every surface reads the same answer on
 * the same frame.
 */
let reducedMotion = false;
const listeners = new Set<() => void>();

const publish = (next: boolean): void => {
    if (next === reducedMotion) {
        return;
    }
    reducedMotion = next;
    listeners.forEach((listener) => listener());
};

// Resolved once at module load rather than on first mount: the answer is
// usually back before anything animates, so the first transition of the
// session already honors the setting instead of playing and then correcting.
let started = false;
const start = (): void => {
    if (started) {
        return;
    }
    started = true;
    void AccessibilityInfo.isReduceMotionEnabled()
        .then(publish)
        .catch(() => undefined);
    AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
};

const subscribe = (listener: () => void): (() => void) => {
    start();
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const getSnapshot = (): boolean => reducedMotion;

/**
 * Subscribe a component to the OS reduced-motion setting.
 *
 * Honor it by collapsing duration to 0 rather than by branching the animation
 * away entirely — the surface must still land in its final state, and a
 * zero-duration timing does that in one frame with no extra code path to keep
 * correct.
 */
export const useReducedMotionPreference = (): boolean =>
    useSyncExternalStore(subscribe, getSnapshot);

/**
 * Non-reactive read, for worklet setup and module-level handlers that need the
 * current answer but must not subscribe (a `runOnJS` callback, a press handler).
 */
export const getReducedMotionPreference = (): boolean => {
    start();
    return reducedMotion;
};

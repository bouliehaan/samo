import { useEffect, useRef, useState } from 'react';
import { type SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { durations, easings } from '../theme/motion';
import { useReducedMotionPreference } from './use-reduced-motion-preference';

/**
 * Keeps a surface MOUNTED long enough for its exit animation to actually play.
 *
 * Every overlay host in this app had the same latent bug, in the same shape:
 *
 *     detailProgress.value = withTiming(open ? 1 : 0, ...);   // exit animation
 *     if (!open) return null;                                 // ...never runs
 *
 * The close animation is written, reviewed, and completely dead — the host
 * unmounts on the very render that starts it, so the surface vanishes on a
 * frame boundary. Fixing that per host means each one hand-rolling a "still
 * closing" flag, a cancel path, and a timer; that is three copies of a subtle
 * race, so it lives here once.
 *
 * Returns the mount gate plus the 0→1 progress every animated style should
 * read. Progress is a shared value: the transition runs entirely on the UI
 * thread and is unaffected by whatever the JS thread is doing when the user
 * hits back (which, in this app, is frequently a catalog derive).
 *
 * WHY A TIMER AND NOT AN ANIMATION CALLBACK — the same reason TabSceneContainer
 * rests on a timeout: `withTiming`'s completion callback has to `runOnJS` to
 * touch React state, and that hop lands on the JS queue ASYNCHRONOUSLY. Reopen
 * the surface during its own exit and the stale completion arrives afterwards,
 * unmounting a surface the user is now looking at. A timeout is cancellable
 * synchronously in the effect's cleanup, so re-showing during an exit provably
 * cannot unmount anything.
 */
export function usePresenceTransition(
    visible: boolean,
    options?: {
        /** Exit duration. Defaults to the screen-exit token. */
        exitMs?: number;
        /** Enter duration. Defaults to the screen-enter token. */
        enterMs?: number;
    },
): { isMounted: boolean; progress: SharedValue<number> } {
    const reducedMotion = useReducedMotionPreference();
    const enterMs = options?.enterMs ?? durations.screenEnter;
    const exitMs = options?.exitMs ?? durations.screenExit;

    const progress = useSharedValue(visible ? 1 : 0);
    const [isMounted, setIsMounted] = useState(visible);

    // Latest durations without re-running the transition effect when a caller
    // passes fresh option objects: the effect must fire on VISIBILITY, not on
    // the identity of its config.
    const config = useRef({ enterMs, exitMs, reducedMotion });
    config.current = { enterMs, exitMs, reducedMotion };

    useEffect(() => {
        const { enterMs: enter, exitMs: exit, reducedMotion: reduced } = config.current;

        if (visible) {
            // Mount first, animate second. Both happen in this one effect pass,
            // so the subtree is committed and laid out before progress leaves
            // 0 — the entrance never spends its opening frames waiting on Yoga.
            setIsMounted(true);
            progress.value = withTiming(1, {
                duration: reduced ? 0 : enter,
                easing: easings.emphasized,
            });
            return;
        }

        progress.value = withTiming(0, {
            duration: reduced ? 0 : exit,
            easing: easings.exit,
        });

        if (reduced) {
            setIsMounted(false);
            return;
        }

        // Slack past the last animated frame so the unmount can never land on
        // a surface still mid-fade (same guard as TabSceneContainer's rest).
        const timer = setTimeout(() => setIsMounted(false), exit + UNMOUNT_SLACK_MS);
        return () => clearTimeout(timer);
    }, [progress, visible]);

    return { isMounted, progress };
}

/** Slack between the exit's final frame and the unmount. */
const UNMOUNT_SLACK_MS = 30;

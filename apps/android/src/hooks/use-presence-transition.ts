import { useEffect, useId, useRef, useState } from 'react';
import { type SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { beginChromeGlassMotion, endChromeGlassMotion } from '../state/chrome-glass';
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

    // Held for the length of every enter and exit: a full-screen overlay
    // cross-fading is a full-screen redraw per frame, and a live backdrop blur
    // re-rasterises the whole view tree in software on top of each one. See
    // state/chrome-glass.
    // Distinct per transition instance — see useChoreography.
    const glassMotionKey = `presence:${useId()}`;
    useEffect(() => () => endChromeGlassMotion(glassMotionKey), [glassMotionKey]);

    // PASS 1 — the mount gate. Opening ONLY raises the gate; it deliberately
    // does not touch `progress`. See pass 2 for why.
    useEffect(() => {
        if (visible) {
            setIsMounted(true);
            return;
        }

        const { exitMs: exit, reducedMotion: reduced } = config.current;

        progress.value = withTiming(0, {
            duration: reduced ? 0 : exit,
            easing: easings.exit,
        });

        if (reduced) {
            setIsMounted(false);
            return;
        }

        beginChromeGlassMotion(glassMotionKey);
        // Slack past the last animated frame so the unmount can never land on
        // a surface still mid-fade (same guard as TabSceneContainer's rest).
        const timer = setTimeout(() => setIsMounted(false), exit + UNMOUNT_SLACK_MS);
        const glassTimer = setTimeout(
            () => endChromeGlassMotion(glassMotionKey),
            exit + UNMOUNT_SLACK_MS,
        );
        return () => {
            clearTimeout(timer);
            clearTimeout(glassTimer);
            endChromeGlassMotion(glassMotionKey);
        };
    }, [glassMotionKey, progress, visible]);

    // PASS 2 — the entrance, and it MUST be its own pass.
    //
    // `setIsMounted(true)` only SCHEDULES a render; it does not commit one.
    // Starting `withTiming(1)` alongside it — which is what this hook used to
    // do — hands the UI thread a clock that begins ticking immediately, while
    // the subtree it is supposed to be revealing does not exist until React
    // has rendered, laid out, and mounted it one or more frames later. The
    // entrance then spends its opening frames animating nothing, and whatever
    // is left of the 200ms when the views finally appear is all the user sees:
    // a heavy surface (a detail page with fifty rows) can be most of the way
    // through its own fade — or past the end of it — before it has anything to
    // fade. That is the "the animation just didn't play" bug, and it is worst
    // on exactly the surfaces that most need the polish.
    //
    // Keying this effect on `isMounted` inverts it correctly: the gate opens,
    // React commits the subtree at progress 0 (mounted, invisible, laid out),
    // and only THEN does the clock start. This is motion.ts rule 4 — pay the
    // mount cost BEFORE the animation, never during — enforced structurally
    // rather than by convention.
    //
    // A re-show DURING an exit (isMounted never dropped) re-runs this on the
    // `visible` dep alone and starts the entrance on the same frame, which is
    // right: nothing needs mounting, so there is nothing to wait for.
    useEffect(() => {
        if (!visible || !isMounted) {
            return;
        }
        const { enterMs: enter, reducedMotion: reduced } = config.current;
        progress.value = withTiming(1, {
            duration: reduced ? 0 : enter,
            easing: easings.emphasized,
        });
        if (reduced) {
            return;
        }
        beginChromeGlassMotion(glassMotionKey);
        const glassTimer = setTimeout(() => endChromeGlassMotion(glassMotionKey), enter);
        return () => {
            clearTimeout(glassTimer);
            endChromeGlassMotion(glassMotionKey);
        };
    }, [glassMotionKey, isMounted, progress, visible]);

    return { isMounted, progress };
}

/** Slack between the exit's final frame and the unmount. */
const UNMOUNT_SLACK_MS = 30;

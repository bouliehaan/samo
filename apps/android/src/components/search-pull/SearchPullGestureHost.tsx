import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, withSpring } from 'react-native-reanimated';

import { triggerImpact } from '../../services/haptics';
import { beginImeControl, finishImeControl, setImeFraction } from '../../services/ime-control';
import { styles } from '../../theme/styles';
import { REDUCED_MOTION_SPRING } from '../../theme/layout';
import { useSearchPullContext } from './SearchPullContext';
import {
    IME_FRACTION_EPSILON,
    SEARCH_PULL_ACTIVATE_DY,
    SEARCH_PULL_COMMIT_AT,
    SEARCH_PULL_COMMIT_SPAN,
    SEARCH_PULL_FAIL_DX,
    SEARCH_PULL_FLING_VELOCITY,
    SEARCH_PULL_IME_RELEASE_AT,
    SEARCH_PULL_MOUNT_AT,
    SEARCH_PULL_OPEN_SPRING,
    SEARCH_PULL_PEEK_AT,
    SEARCH_PULL_PEEK_DISTANCE,
    SEARCH_PULL_SETTLE_SPRING,
    SEARCH_PULL_DISMISS_VELOCITY,
    SEARCH_PULL_SKIP_AT,
    SEARCH_PULL_SKIP_VELOCITY,
} from './search-pull-constants';
import { pullReveal, resolvePullRelease, revealVelocity } from './search-pull-physics';
import { getPullNativeGestures, setPullRegistryListener } from './search-pull-registry';

/**
 * THE ONE PULL PAN, mounted above the tab scenes where nothing can freeze it.
 *
 * This used to be built inside every screen by `useSearchPull`, and that is what
 * made the gesture die. Every visited tab stays mounted behind `<Freeze>`, and
 * suspending a subtree destroys its `GestureDetector` effects — RNGH dropped the
 * pan and the page's `Gesture.Native()` together and re-created them on thaw,
 * but the `blocksExternalGesture` relation between them did not survive the
 * round trip. Measured on device, the pan then ACTIVATED and the orchestrator
 * cancelled it ~2ms later: `onFinalize(success=false)` with no `onChange` and no
 * `onEnd`. Every tab's pull worked exactly once, on its first mount, and was
 * dead forever after the first tab switch.
 *
 * Up here the detector is never suspended, so RNGH's own repair path works as
 * designed: this detector's mount listener stays alive to hear a page's native
 * gesture remount and re-send the relation — the thing it could not do when both
 * ends of the relation were frozen together in the same subtree.
 *
 * The page keeps only the two halves that genuinely belong to it: its own
 * `Gesture.Native()` (which must wrap its own scroller) and its scroll offset.
 * Both arrive here through `search-pull-registry`.
 */
export const SearchPullGestureHost = ({ children }: { children: ReactNode }) => {
    const { activeScrollY, commitFullSearch, isPanDrivingIme, pull, reducedMotion } =
        useSearchPullContext();

    /*
     * PER-GESTURE STATE MUST BE SHARED VALUES. Do not "simplify" these into a
     * plain object captured by the closure.
     *
     * Every handler below is a worklet, and Reanimated serializes each worklet's
     * captured closure to the UI thread INDEPENDENTLY — a plain object is deep
     * copied per worklet, so `onTouchesDown` and `onTouchesMove` end up mutating
     * two different copies. Measured on device the instant this was tried: the
     * touch-down handler set `startedAtTop = true` and stored the origin, and
     * the very next move read `startedAtTop === false` with `touchStartX === 0`,
     * so `dx` came back as the raw screen coordinate, the "mostly sideways" test
     * fired, and the pan failed itself before it could ever activate. The pull
     * was dead everywhere, on every page, from the first touch.
     *
     * Shared values are the only mutable state a group of worklets genuinely
     * share. (These were never about each tab owning a copy — there is one pan
     * now, and they are still required.)
     */
    const hasActivated = useSharedValue(false);
    const hasRequestedIme = useSharedValue(false);
    const hasSeated = useSharedValue(false);
    /** Last IME fraction actually pushed across to JS. -1 = none this gesture. */
    const lastImeFraction = useSharedValue(-1);
    const startedAtTop = useSharedValue(false);
    const touchStartX = useSharedValue(0);
    const touchStartY = useSharedValue(0);

    // Rebuilt when a page registers or drops a native gesture — a handful of
    // times as tabs are first visited and thawed, never per render.
    const [registryVersion, setRegistryVersion] = useState(0);
    useEffect(() => {
        setPullRegistryListener(() => setRegistryVersion((version) => version + 1));
        /*
         * RE-READ ON INSTALL. This is not belt-and-braces; without it the pan
         * blocks NOTHING on first mount.
         *
         * Effects run child-first, so every page inside this host has already
         * run its `registerPullScroller` effect by the time this one does — and
         * those calls fired `onRegistryChanged` while it was still null. The
         * notification is gone, `registryVersion` never moves, and the memo
         * below keeps the `blocksExternalGesture()` it built during the FIRST
         * render, when the registry was empty: an empty relation list.
         *
         * With no block relation the scroll view's native gesture is free to
         * activate and the orchestrator cancels this pan the moment it does —
         * the exact ACTIVATE-then-cancel failure this whole refactor exists to
         * fix, reintroduced one layer up.
         */
        setRegistryVersion((version) => version + 1);
        return () => setPullRegistryListener(null);
    }, []);

    const gesture = useMemo(() => {
        const openSpring = reducedMotion ? REDUCED_MOTION_SPRING : SEARCH_PULL_OPEN_SPRING;
        const settleSpring = reducedMotion ? REDUCED_MOTION_SPRING : SEARCH_PULL_SETTLE_SPRING;

        /**
         * Hand the IME session back and forget it, so the next crossing arms a
         * fresh one. Safe to call when no session is held.
         *
         * `isPanDrivingIme` drops here rather than only at the end of the gesture:
         * the instant this pan stops holding a session, the surface's own teardown
         * is allowed to run again — it is only barred while a pan genuinely owns
         * the keyboard.
         */
        const releaseIme = () => {
            'worklet';
            if (!hasRequestedIme.value) {
                return;
            }
            hasRequestedIme.value = false;
            isPanDrivingIme.value = false;
            lastImeFraction.value = -1;
            runOnJS(finishImeControl)(false);
        };

        return (
            Gesture.Pan()
                /*
                 * BLOCKS, not simultaneous-with. Simultaneity let the page keep
                 * scrolling underneath a pull the finger was already driving —
                 * two responses to one finger. Blocking makes the scroller wait
                 * for this pan to FAIL, which is only affordable because of the
                 * manual activation below: the pan resolves on the first move
                 * event, so an ordinary scroll waits a single frame for an answer.
                 */
                .blocksExternalGesture(...getPullNativeGestures())
                /*
                 * MANUAL ACTIVATION IS LOAD-BEARING. Do not go back to
                 * `.activeOffsetY()`, which activates on ANY downward drag at any
                 * scroll position and swallows half the scroller's gestures (the
                 * app-wide "scrolls up but not down" bug). The pan claims NOTHING
                 * by default; it must explicitly activate, and it fails itself
                 * everywhere the pull is not wanted.
                 */
                .manualActivation(true)
                .onTouchesDown((event) => {
                    'worklet';
                    // Only the FIRST finger arms the gesture. A second pointer
                    // landing mid-pull would otherwise re-seed the origin to
                    // wherever finger one had already dragged to, and — worst —
                    // clear the IME flag, leaving a control session held with
                    // nothing driving it (the keyboard then stops answering focus).
                    if (event.numberOfTouches > 1) {
                        return;
                    }
                    const touch = event.allTouches[0];
                    touchStartX.value = touch ? touch.absoluteX : 0;
                    touchStartY.value = touch ? touch.absoluteY : 0;
                    // Only a pull that STARTED at the top may reveal search; a
                    // drag that reaches the top mid-scroll stays a scroll.
                    startedAtTop.value = activeScrollY.value <= 1;
                    // Seeded from where the surface ACTUALLY is, not assumed
                    // parked — search being open is pull === 2, and forcing this
                    // false made the first frame of a dismissing touch read as a
                    // fresh upward seat crossing, re-arming the IME on the way out.
                    hasSeated.value = pull.value >= 1;
                    hasActivated.value = false;
                    hasRequestedIme.value = false;
                    lastImeFraction.value = -1;
                })
                .onTouchesMove((event, manager) => {
                    'worklet';
                    if (hasActivated.value) {
                        return;
                    }
                    const touch = event.allTouches[0];
                    if (!touch) {
                        return;
                    }
                    const dy = touch.absoluteY - touchStartY.value;
                    const dx = touch.absoluteX - touchStartX.value;
                    // Not at the top: this is a scroll, full stop. Failing here is
                    // what keeps the list moving in BOTH directions.
                    if (!startedAtTop.value) {
                        manager.fail();
                        return;
                    }
                    // Mostly sideways — belongs to a carousel or an edge gesture.
                    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SEARCH_PULL_FAIL_DX) {
                        manager.fail();
                        return;
                    }
                    // Heading up: a scroll, even from the top.
                    if (dy < -SEARCH_PULL_ACTIVATE_DY) {
                        manager.fail();
                        return;
                    }
                    if (dy > SEARCH_PULL_ACTIVATE_DY) {
                        hasActivated.value = true;
                        manager.activate();
                    }
                })
                .onChange((event) => {
                    'worklet';
                    if (!startedAtTop.value || event.translationY <= 0) {
                        /*
                         * PARKED, AND PARKED BY THE FINGER — not by a spring.
                         *
                         * This used to fire `withSpring(0)` here, which is an
                         * animation competing with a thumb that is still on the
                         * glass. Drag up past the origin and the surface stopped
                         * obeying you and glided off on its own clock; drag back
                         * down and it jumped to wherever the drag said it should
                         * be, from wherever the spring had got to. That is the
                         * whole of the "it isn't 1:1" feeling, and it is worst in
                         * exactly the gesture that exposes it — holding on and
                         * working up and down.
                         *
                         * `pullReveal` already returns 0 for any non-positive
                         * translation, so tracking the finger here IS parking it.
                         * No spring can settle wrong because there is no spring,
                         * and coming back down resumes at the same rate it left.
                         * Springs belong to the release, where no finger is left
                         * to argue with them.
                         */
                        pull.value = 0;
                        hasSeated.value = false;
                        // Dragged back above the origin WITHOUT lifting. The
                        // gesture is still live, so nothing else will hand the
                        // session back — see releaseIme.
                        releaseIme();
                        return;
                    }
                    pull.value = pullReveal(
                        event.translationY,
                        SEARCH_PULL_PEEK_DISTANCE,
                        SEARCH_PULL_COMMIT_SPAN,
                    );
                    /*
                     * THE SESSION IS RELEASED AND RE-TAKEN WITHIN ONE GESTURE.
                     *
                     * `hasRequestedIme` used to latch for the whole pan, so a drag
                     * that went down, back up, and down again never re-requested —
                     * the second descent drove a controller that had been torn
                     * down in the meantime, and the keyboard stopped answering
                     * from that crossing on. Resolved on the FRESH reveal, below,
                     * so a frame cannot both release and re-request.
                     */
                    if (hasRequestedIme.value && pull.value < SEARCH_PULL_IME_RELEASE_AT) {
                        releaseIme();
                    }
                    /*
                     * Request IME control as soon as the pull is meaningfully
                     * underway — NOT at the seat. The system takes ~740ms to hand
                     * over a WindowInsetsAnimationController, so asking at the seat
                     * meant short gestures finished before control existed.
                     */
                    if (!hasRequestedIme.value && pull.value > SEARCH_PULL_MOUNT_AT) {
                        hasRequestedIme.value = true;
                        isPanDrivingIme.value = true;
                        runOnJS(beginImeControl)();
                    }
                    /*
                     * THE ONLY HAPTIC DURING A DRAG, and it is a detent: at reveal
                     * 1 the bar reaches its rest line and stops. It fires in BOTH
                     * directions, because a detent you back out of clicks on the
                     * way out too.
                     */
                    const isSeated = pull.value >= 1;
                    if (isSeated !== hasSeated.value) {
                        hasSeated.value = isSeated;
                        runOnJS(triggerImpact)('light');
                        // No re-arm here any more. It used to try to catch a dead
                        // session at the seat and could never fire, because the
                        // flag it tested was latched true for the whole gesture.
                        // The release/request pair above is the real mechanism, and
                        // it runs on every frame rather than only on a crossing.
                    }
                    /*
                     * THE KEYBOARD IS PART OF THE GESTURE. Reveal 1 = keyboard
                     * fully down, 2 = fully up, every frame between puts it exactly
                     * where the finger says. Control is asynchronous, so
                     * `setImeFraction` no-ops until it lands rather than erroring.
                     */
                    if (hasRequestedIme.value) {
                        const imeFraction = Math.min(1, Math.max(0, pull.value - 1));
                        /*
                         * ONLY HOP WHEN THE KEYBOARD WOULD ACTUALLY MOVE.
                         *
                         * This used to fire `runOnJS` unconditionally, once per
                         * frame, for the whole drag — the thing motion.ts rule 3
                         * forbids outright, and the round trip is worse than it
                         * looks: this worklet is on the Android main thread, the
                         * hop lands on the JS thread, and `setFraction` then has
                         * to come BACK to the main thread to touch the IME. Two
                         * thread handoffs per frame, inside the gesture handler,
                         * competing with the very frame it is trying to render.
                         *
                         * Most of them moved nothing. Across the whole of stage
                         * one the clamp above pins this to a constant 0 — a solid
                         * 140px of drag spent posting the same zero sixty times a
                         * second — and during stage two any frame the thumb barely
                         * moved repeats its predecessor to well under a pixel of
                         * IME travel.
                         *
                         * The epsilon is ~1px on a full-height keyboard, so the
                         * motion this drops is not motion anyone can see. Exact
                         * bounds are always sent: 0 and 1 are the states the IME
                         * has to actually ARRIVE at, and letting the epsilon eat
                         * the last fraction of travel would strand it a pixel shy
                         * of closed.
                         */
                        const atBound =
                            (imeFraction === 0 || imeFraction === 1) &&
                            imeFraction !== lastImeFraction.value;
                        if (
                            atBound ||
                            Math.abs(imeFraction - lastImeFraction.value) >=
                                IME_FRACTION_EPSILON
                        ) {
                            lastImeFraction.value = imeFraction;
                            runOnJS(setImeFraction)(imeFraction);
                        }
                    }
                })
                .onEnd((event, success) => {
                    'worklet';
                    /*
                     * THE RELEASE IS RESOLVED FROM THE FINGER, NOT FROM `pull`.
                     * `pull` is an animated value anything may be driving — reading
                     * it sampled this gesture's own spring mid-flight, so a search
                     * screen the user had just dragged off reported ~1.3 on the way
                     * past and slammed back to its seat.
                     */
                    const releaseReveal = pullReveal(
                        event.translationY,
                        SEARCH_PULL_PEEK_DISTANCE,
                        SEARCH_PULL_COMMIT_SPAN,
                    );
                    // `success` false means CANCELLED, which is the system taking
                    // the touch back — never a decision the user made.
                    const decision =
                        !success || !startedAtTop.value
                            ? 'retract'
                            : resolvePullRelease({
                                  commitAt: SEARCH_PULL_COMMIT_AT,
                                  dismissVelocity: SEARCH_PULL_DISMISS_VELOCITY,
                                  flingVelocity: SEARCH_PULL_FLING_VELOCITY,
                                  peekAt: SEARCH_PULL_PEEK_AT,
                                  reveal: releaseReveal,
                                  skipAt: SEARCH_PULL_SKIP_AT,
                                  skipVelocity: SEARCH_PULL_SKIP_VELOCITY,
                                  velocityY: event.velocityY,
                              });
                    // Captured BEFORE the reset: reading it after made `didSkipPeek`
                    // permanently true, so every commit took the focus fallback and
                    // blurred away the keyboard the gesture had just carried up.
                    const hadImeSession = hasRequestedIme.value;
                    if (hadImeSession) {
                        runOnJS(finishImeControl)(decision === 'commit');
                        hasRequestedIme.value = false;
                        isPanDrivingIme.value = false;
                    }
                    /*
                     * THE FINGER'S MOMENTUM SURVIVES THE RELEASE, on every one of
                     * the three outcomes.
                     *
                     * Only `retract` used to take it; peek and commit both started
                     * their spring from a dead stop, so letting go mid-throw made
                     * the surface halt for a frame and then re-accelerate under its
                     * own power. That velocity step at the exact instant the hand
                     * leaves the glass is the loudest tell that a surface is being
                     * animated at you rather than moved by you — and it fired on
                     * the two outcomes that happen most.
                     *
                     * The reason it was left out is real and is handled in the
                     * spring instead: momentum into a rest line overshoots, so
                     * `SEARCH_PULL_OPEN_SPRING` clamps. Cancelled gestures
                     * contribute nothing — `success` false is the system taking the
                     * touch back, and there is no throw to honour in that.
                     */
                    const releaseVelocity = revealVelocity(
                        success ? event.velocityY : 0,
                        releaseReveal,
                        SEARCH_PULL_PEEK_DISTANCE,
                        SEARCH_PULL_COMMIT_SPAN,
                    );
                    if (decision === 'retract') {
                        // Targets 0, off the top of the screen, so this is the one
                        // spring left unclamped — overshoot is out of sight.
                        pull.value = withSpring(0, {
                            ...settleSpring,
                            velocity: releaseVelocity,
                        });
                        return;
                    }
                    if (decision === 'commit') {
                        // Finish the motion the finger started: carry reveal the rest
                        // of the way to 2, which IS full search. The landing tick
                        // lives in SearchPullSurface, on the reveal crossing.
                        pull.value = withSpring(2, {
                            ...openSpring,
                            velocity: releaseVelocity,
                        });
                        runOnJS(commitFullSearch)(!hadImeSession);
                        return;
                    }
                    // Settle onto the seat, riding whatever speed the hand left
                    // behind. The spring clamps rather than bouncing through it.
                    pull.value = withSpring(1, { ...openSpring, velocity: releaseVelocity });
                })
                .onFinalize(() => {
                    'worklet';
                    /*
                     * The net under `onEnd`, which RNGH only calls for a pan that
                     * reached ACTIVE. This runs for every terminal transition, and
                     * exists for one thing: NEVER leave an IME session held. A
                     * controller we take and don't give back leaves the keyboard
                     * under our thumb with nothing driving it.
                     */
                    releaseIme();
                    isPanDrivingIme.value = false;
                    hasActivated.value = false;
                    lastImeFraction.value = -1;
                })
        );
        // `registryVersion` is the dependency that matters: it changes when a page
        // registers a new native gesture, which is what `blocksExternalGesture`
        // above closes over.
    }, [
        activeScrollY,
        commitFullSearch,
        hasActivated,
        hasRequestedIme,
        hasSeated,
        isPanDrivingIme,
        lastImeFraction,
        pull,
        reducedMotion,
        registryVersion,
        startedAtTop,
        touchStartX,
        touchStartY,
    ]);

    /*
     * The `collapsable={false}` host view is REQUIRED.
     *
     * GestureDetector attaches its handler to the native view its child
     * resolves to, and it does that by cloning the child and handing it a ref —
     * so a composite child (TabScenes) would receive a ref it does not forward
     * and the pan would silently never wire up. Android also collapses
     * layout-only Views out of the hierarchy at mount, so an ordinary <View>
     * here would be optimised away and leave the detector in the same position.
     * This is the same rule the page-level scroll hosts learned the hard way.
     */
    return (
        <GestureDetector gesture={gesture}>
            <View collapsable={false} style={styles.searchPullGestureHost}>
                {children}
            </View>
        </GestureDetector>
    );
};

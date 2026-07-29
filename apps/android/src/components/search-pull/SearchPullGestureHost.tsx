import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, withSpring } from 'react-native-reanimated';

import { triggerImpact } from '../../services/haptics';
import { beginImeControl, finishImeControl, setImeFraction } from '../../services/ime-control';
import { beginChromeGlassMotion, endChromeGlassMotion } from '../../state/chrome-glass';
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
    SEARCH_PULL_MOUNT_AT,
    SEARCH_PULL_OPEN_SPRING,
    SEARCH_PULL_PEEK_AT,
    SEARCH_PULL_PEEK_DISTANCE,
    SEARCH_PULL_SETTLE_SPRING,
    SEARCH_PULL_DISMISS_VELOCITY,
    SEARCH_PULL_SKIP_AT,
    SEARCH_PULL_SKIP_VELOCITY,
} from './search-pull-constants';
import { pullReveal, resolvePullRelease } from './search-pull-physics';
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
/** Tail added to the glass freeze so it spans the release spring, not just the
 *  finger. See the `onFinalize` note below for where the number comes from. */
const GLASS_PULL_SETTLE_MS = 380;

export const SearchPullGestureHost = ({ children }: { children: ReactNode }) => {
    const { activeScrollY, commitFullSearch, pull, reducedMotion } = useSearchPullContext();

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
    const isSpringingBack = useSharedValue(false);
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
                    /*
                     * TOUCH-DOWN IS THE EARLIEST HONEST SIGNAL THAT THE WORLD IS
                     * ABOUT TO MOVE, and this detector wraps every tab scene, so
                     * one line here covers every touch the app's pages ever see.
                     *
                     * It has to be the touch and not the activation: the chrome
                     * glass freeze has to be in place BEFORE the first animated
                     * frame, and a prop that only starts crossing to native once
                     * the pan activates would land several frames into the very
                     * motion it is meant to protect. Freezing for a tap that
                     * turns out to be nothing costs nothing — it just means the
                     * glass re-samples 220ms later than it would have.
                     */
                    runOnJS(beginChromeGlassMotion)('pull');
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
                    isSpringingBack.value = false;
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
                        // Spring away ONCE rather than slamming `pull` to 0 every
                        // frame — a restart every frame reads the spring's own
                        // current value as the new origin and never settles.
                        if (!isSpringingBack.value && pull.value !== 0) {
                            isSpringingBack.value = true;
                            pull.value = withSpring(0, settleSpring);
                        }
                        hasSeated.value = false;
                        return;
                    }
                    isSpringingBack.value = false;
                    /*
                     * Request IME control as soon as the pull is meaningfully
                     * underway — NOT at the seat. The system takes ~740ms to hand
                     * over a WindowInsetsAnimationController, so asking at the seat
                     * meant short gestures finished before control existed.
                     */
                    if (!hasRequestedIme.value && pull.value > SEARCH_PULL_MOUNT_AT) {
                        hasRequestedIme.value = true;
                        runOnJS(beginImeControl)();
                    }
                    pull.value = pullReveal(
                        event.translationY,
                        SEARCH_PULL_PEEK_DISTANCE,
                        SEARCH_PULL_COMMIT_SPAN,
                    );
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
                        // Re-arm on every upward crossing, never when already fully
                        // open: the system reclaims the IME freely, and latching to
                        // the first crossing left a dead controller being driven.
                        if (isSeated && pull.value < 1.9 && !hasRequestedIme.value) {
                            hasRequestedIme.value = true;
                            runOnJS(beginImeControl)();
                        }
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
                    }
                    if (decision === 'retract') {
                        // The one release that takes the throw velocity: it targets
                        // 0, off the top of the screen, so overshoot is out of sight.
                        pull.value = withSpring(0, {
                            ...settleSpring,
                            velocity: success ? event.velocityY / SEARCH_PULL_PEEK_DISTANCE : 0,
                        });
                        return;
                    }
                    if (decision === 'commit') {
                        // Finish the motion the finger started: carry reveal the rest
                        // of the way to 2, which IS full search. The landing tick
                        // lives in SearchPullSurface, on the reveal crossing.
                        pull.value = withSpring(2, openSpring);
                        runOnJS(commitFullSearch)(!hadImeSession);
                        return;
                    }
                    // Settle onto the seat. No velocity injected: the spring targets
                    // the rest line, so momentum would push it past and back.
                    pull.value = withSpring(1, openSpring);
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
                    if (hasRequestedIme.value) {
                        runOnJS(finishImeControl)(false);
                        hasRequestedIme.value = false;
                    }
                    /*
                     * Terminal for EVERY path the touch can take, which is what
                     * the glass hold needs — a pan that fails itself (an ordinary
                     * scroll) gets no onEnd, and releasing there would strand the
                     * freeze on the app's most common gesture.
                     *
                     * The settle covers the RELEASE SPRING, which outlives this
                     * callback: OPEN/SETTLE are critically damped at ωn ≈ 15.5 and
                     * ≈ 17.8 rad/s, so they are visually done by ~260ms. Thawing at
                     * the default 220 would put the glass live in the middle of the
                     * throw, which is the one frame of the whole gesture the eye is
                     * actually following.
                     */
                    runOnJS(endChromeGlassMotion)('pull', GLASS_PULL_SETTLE_MS);
                    isSpringingBack.value = false;
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
        isSpringingBack,
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

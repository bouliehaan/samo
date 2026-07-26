import { type SamoMobileTabId } from '@samo/core/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type ScrollViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    runOnJS,
    useAnimatedScrollHandler,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { triggerImpact } from '../../services/haptics';
import { beginImeControl, finishImeControl, setImeFraction } from '../../services/ime-control';
import { subscribeTabReselected } from '../../state/tab-reselect';
import { REDUCED_MOTION_SPRING } from '../../theme/layout';
import { useSearchPullContext } from './SearchPullContext';
import {
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
    SEARCH_PULL_SKIP_AT,
    SEARCH_PULL_SKIP_VELOCITY,
} from './search-pull-constants';
import { pullReveal, resolvePullRelease } from './search-pull-physics';

type DrawerScrollable = {
    scrollTo?: (options: { animated?: boolean; y: number }) => void;
    scrollToOffset?: (options: { animated?: boolean; offset: number }) => void;
};

/**
 * Per-host wiring for the pull-down search surface. Replaces the old
 * `useSearchDrawerScroll`: no scroll parking, no snap offsets, no programmatic
 * `scrollTo` fighting momentum (the ANR machinery is gone with it). The list
 * just starts at the top; a downward pan at the top drives the app-level `pull`
 * through a rubber band and springs to a two-threshold decision on release.
 *
 * The gesture/scroll composition has TWO halves, and both are required.
 *
 * 1. The scroll's own native gesture is made explicit as `nativeGesture` and
 *    attached to the actual scroll view — via `renderScrollComponent` on a
 *    FlashList, or an inner `<GestureDetector>` on a plain ScrollView — and the
 *    pan declares `.simultaneousWithExternalGesture(nativeGesture)`.
 *
 * 2. The pan uses `.manualActivation(true)` and explicitly FAILS itself whenever
 *    the pull is not wanted (not at the top, heading upward, mostly sideways).
 *
 * Half 1 alone is NOT enough, despite what this comment used to claim. It was
 * copied from the queue sheet (see QueueSheetOverlay), where it is sufficient
 * because that sheet attaches no worklet scroll handler and its pan is not
 * competing for ordinary list scrolling. Here, with `.activeOffsetY(+n)`, the
 * pan activated on EVERY downward drag at every scroll position, and declaring
 * simultaneity did not keep the list scrolling underneath it — the list scrolled
 * up but not down, app-wide. Manual activation is what actually keeps the
 * scroller whole: the pan claims nothing unless it means to.
 *
 * `tabId` is only for the re-tap-to-top gesture: a press on the already-active
 * tab glides THIS list back to the top (search retract on re-tap is handled once
 * in the provider).
 */
export const useSearchPull = (tabId: SamoMobileTabId) => {
    const { commitFullSearch, pull, reducedMotion } = useSearchPullContext();

    const scrollableRef = useRef<DrawerScrollable | null>(null);
    // Scroll offset, written on the UI thread — the pan reads it to know whether
    // a drag began at the top (the only place a pull should reveal search).
    const scrollY = useSharedValue(0);
    const startedAtTop = useSharedValue(false);
    // Tracks which side of the seat detent the bar is on, so the detent tick
    // fires on the CROSSING rather than every frame beyond it.
    const hasSeated = useSharedValue(false);
    // Latched while a mid-gesture retract spring is already running, so the
    // per-frame `onChange` starts that spring ONCE instead of restarting it every
    // frame (a restart every frame reads the spring's own current value as the
    // new origin and it never settles — the surface just judders).
    const isSpringingBack = useSharedValue(false);
    // Touch-down origin, tracked by hand because `manualActivation` means the pan
    // has no translation of its own until we activate it.
    const touchStartX = useSharedValue(0);
    const touchStartY = useSharedValue(0);
    // Set once we have claimed the gesture, so a later direction change cancels
    // the pull rather than trying to hand a live gesture back to the scroller.
    const hasActivated = useSharedValue(false);
    // Set once IME control has been REQUESTED for this gesture, so the request
    // fires exactly once — it is asynchronous and the system refuses a second
    // one while the first is in flight.
    const hasRequestedIme = useSharedValue(false);

    // The list's own scroll gesture, made explicit so the pull pan can declare
    // simultaneity with it (and so it survives being wrapped by the pan).
    const nativeGesture = useMemo(() => Gesture.Native(), []);

    const setScrollable = useCallback(
        (node: DrawerScrollable | null) => {
            scrollableRef.current = node;
            if (node) {
                /*
                 * A freshly attached scrollable is at the top BY DEFINITION, and
                 * it will not emit a scroll event to say so — `onScroll` only
                 * fires once something moves.
                 *
                 * Without this, the offset cached from before the scene was torn
                 * down (opening a media detail page, for instance) survives the
                 * remount. `startedAtTop` then reads false against a list that is
                 * visibly at the top, the pan fails itself on every touch, and the
                 * pull is dead everywhere until the user happens to scroll and
                 * refresh the value by hand.
                 */
                scrollY.value = 0;
            }
        },
        [scrollY],
    );

    const scrollToTop = useCallback(() => {
        const scrollable = scrollableRef.current;
        scrollable?.scrollToOffset?.({ animated: true, offset: 0 });
        scrollable?.scrollTo?.({ animated: true, y: 0 });
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const gesture = useMemo(() => {
        const openSpring = reducedMotion ? REDUCED_MOTION_SPRING : SEARCH_PULL_OPEN_SPRING;
        const settleSpring = reducedMotion ? REDUCED_MOTION_SPRING : SEARCH_PULL_SETTLE_SPRING;

        return (
            Gesture.Pan()
                .simultaneousWithExternalGesture(nativeGesture)
                /*
                 * MANUAL ACTIVATION IS LOAD-BEARING. Do not go back to
                 * `.activeOffsetY()`.
                 *
                 * `activeOffsetY(+n)` activates the pan on ANY downward drag, at
                 * any scroll position. An activated pan owns the touch — and
                 * `simultaneousWithExternalGesture` did NOT keep the list
                 * scrolling underneath it. The result was a list that scrolled up
                 * but not down: every downward drag went into a pan that had
                 * already decided (correctly) not to reveal anything, and was then
                 * swallowed. Upward drags never activated the pan, so those still
                 * worked, which is what made it look like "scrolling is glitchy"
                 * rather than "the pan is eating half the gestures".
                 *
                 * With manual activation the pan claims NOTHING by default. It
                 * must explicitly `activate()`, and in every case where the pull
                 * is not wanted it `fail()`s, handing the touch cleanly to the
                 * scroller with no contention at all.
                 */
                .manualActivation(true)
                .onTouchesDown((event) => {
                    'worklet';
                    /*
                     * ONLY THE FIRST FINGER ARMS THE GESTURE.
                     *
                     * `onTouchesDown` fires for EVERY pointer, including one that
                     * lands while a pull is already underway — and everything
                     * below is a fresh-gesture reset. A second finger therefore
                     * re-seeded the origin to wherever the first one had already
                     * dragged to (allTouches[0] is still finger one, at its
                     * CURRENT position), cleared `hasActivated` so the fail checks
                     * re-ran against that bogus dy and could `fail()` an
                     * already-active pan, and — worst — cleared `hasRequestedIme`,
                     * which is the only thing telling `onEnd` to hand the keyboard
                     * back. The IME session was then never finished: the system
                     * kept handing us a controller nobody drove, so the keyboard
                     * stopped answering focus until some later gesture happened to
                     * release it.
                     *
                     * Extra pointers are simply not our business. The pan follows
                     * finger one; the rest are ignored until the touch sequence
                     * ends and a genuine new one begins.
                     */
                    if (event.numberOfTouches > 1) {
                        return;
                    }
                    const touch = event.allTouches[0];
                    touchStartX.value = touch ? touch.absoluteX : 0;
                    touchStartY.value = touch ? touch.absoluteY : 0;
                    // Captured at touch-down: only a pull that STARTED at the top
                    // may reveal search. A drag that reaches the top mid-scroll
                    // stays a scroll.
                    startedAtTop.value = scrollY.value <= 1;
                    // Seeded from where the surface ACTUALLY is, not assumed
                    // parked. Search being open is pull === 2, so forcing this to
                    // false meant the first frame of any touch — including the one
                    // dismissing search — registered as a fresh upward crossing of
                    // the seat: it fired the detent haptic and re-armed IME
                    // control, popping the keyboard back up on the way out.
                    hasSeated.value = pull.value >= 1;
                    isSpringingBack.value = false;
                    hasActivated.value = false;
                    hasRequestedIme.value = false;
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
                        // Drag that no longer qualifies (started mid-list, or the
                        // finger came back above its origin). Spring the surface away
                        // ONCE rather than slamming `pull` to 0 every frame — the
                        // slam is a visible hitch mid-gesture.
                        if (!isSpringingBack.value && pull.value !== 0) {
                            isSpringingBack.value = true;
                            pull.value = withSpring(0, settleSpring);
                        }
                        hasSeated.value = false;
                        return;
                    }
                    isSpringingBack.value = false;
                    /*
                     * Request control as soon as the pull is meaningfully underway
                     * — NOT at the seat. Measured on device, the system takes
                     * ~740ms to hand over a WindowInsetsAnimationController, so
                     * requesting at the seat meant short gestures finished before
                     * control existed: no keyboard at all, or one that only caught
                     * up long after the finger. Asking during stage one buys that
                     * latency back, and asking again is cheap (the native side
                     * resolves immediately when a session is already live).
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
                     * THE ONLY HAPTIC DURING A DRAG, and it is a detent, not a
                     * notification.
                     *
                     * At reveal 1 the bar reaches its rest line and stops: it has
                     * seated, and continued pulling starts bringing the search
                     * screen instead of moving the bar. Something physical happens
                     * at that exact instant and you can see it happen, so a tick
                     * there is the feel of a real catch — like a drawer passing its
                     * stop. It fires in BOTH directions, because a detent you back
                     * out of clicks on the way out too.
                     *
                     * Everything else that used to buzz here is gone: a tick at 2%
                     * reveal (nothing occurs at 2%), and a tick announcing that the
                     * commit threshold had been crossed. That second one was the
                     * worst of them — a vibration standing in for feedback the
                     * screen refused to show. Stage two is visible now, so there is
                     * nothing left to announce.
                     */
                    const isSeated = pull.value >= 1;
                    if (isSeated !== hasSeated.value) {
                        hasSeated.value = isSeated;
                        runOnJS(triggerImpact)('light');
                        // Never re-arm when the surface is already all the way
                        // open — there is no keyboard left to bring in, and asking
                        // would only fight a dismissal in progress.
                        if (isSeated && pull.value < 1.9 && !hasRequestedIme.value) {
                            /*
                             * Re-arm on EVERY upward crossing of the seat, not once
                             * per gesture. Going back and forth across the seat is a
                             * normal thing to do while deciding, and each retreat can
                             * cost us the control session — the system reclaims the
                             * IME freely. Latching this to the first crossing meant
                             * that after one round trip nothing ever re-requested,
                             * and the keyboard either stopped moving or lagged a
                             * beat behind while a dead controller was driven.
                             *
                             * Requesting again while a session is already live is
                             * cheap: the native side resolves immediately with the
                             * existing controller rather than opening a second one.
                             */
                            hasRequestedIme.value = true;
                            runOnJS(beginImeControl)();
                        }
                    }
                    /*
                     * THE KEYBOARD IS PART OF THE GESTURE. Stage two's progress IS
                     * the IME's position: reveal 1 = keyboard fully down, reveal 2
                     * = keyboard fully up, and every frame in between puts it
                     * exactly where the finger says. Reversing the drag walks it
                     * back down at the same rate.
                     *
                     * Control is requested on the first frame past the seat.
                     * Granting it is asynchronous, so `setImeFraction` no-ops for
                     * the frame or two before it lands rather than erroring.
                     */
                    if (hasRequestedIme.value) {
                        const imeFraction = Math.min(1, Math.max(0, pull.value - 1));
                        runOnJS(setImeFraction)(imeFraction);
                    }
                })
                .onEnd((event, success) => {
                    'worklet';
                    /*
                     * THE RELEASE IS RESOLVED FROM THE FINGER, NOT FROM `pull`.
                     *
                     * This read `pull.value`, which is not a record of the drag —
                     * it is an animated shared value that anything may be driving,
                     * including a spring this same gesture started. Back a pull out
                     * (`onChange` above springs it away at translationY <= 0) and
                     * the release then sampled that spring MID-FLIGHT: a search
                     * screen the user had just dragged fully off would report a
                     * reveal of ~1.3 on the way past, resolve to `peek`, and slam
                     * the bar back down to its seat. A cancel that leaves the thing
                     * you cancelled sitting there is the whole of the "dismissing
                     * search only dismisses it to the peek" report.
                     *
                     * It hurt the other end too: `pull` trails the last update
                     * event, while `translationY` here is the release's own, so a
                     * fast flick under-reported how far it had come and was denied
                     * the velocity skip it had earned.
                     *
                     * `pullReveal` on the release translation is the SAME function
                     * `onChange` drove the surface with, evaluated one last time on
                     * the last thing the hand actually did. During an ordinary drag
                     * the two agree exactly; the difference is only ever a `pull`
                     * that some animation had taken over.
                     */
                    const releaseReveal = pullReveal(
                        event.translationY,
                        SEARCH_PULL_PEEK_DISTANCE,
                        SEARCH_PULL_COMMIT_SPAN,
                    );
                    // `success` is false when the pan was CANCELLED rather than
                    // released — the system taking the touch back is not a decision
                    // the user made, so it can only ever mean "put it away".
                    const decision =
                        !success || !startedAtTop.value
                            ? 'retract'
                            : resolvePullRelease({
                                  commitAt: SEARCH_PULL_COMMIT_AT,
                                  flingVelocity: SEARCH_PULL_FLING_VELOCITY,
                                  peekAt: SEARCH_PULL_PEEK_AT,
                                  reveal: releaseReveal,
                                  skipAt: SEARCH_PULL_SKIP_AT,
                                  skipVelocity: SEARCH_PULL_SKIP_VELOCITY,
                                  velocityY: event.velocityY,
                              });
                    // Captured BEFORE the reset below. Reading the shared value
                    // after clearing it made `didSkipPeek` permanently true, so
                    // every commit — including a slow finger-driven one — took the
                    // system-focus fallback and blur()'d away the keyboard this
                    // gesture had just carried up by hand.
                    const hadImeSession = hasRequestedIme.value;
                    if (hadImeSession) {
                        // Settle the keyboard to whichever end the release chose.
                        // The system animates the REMAINING distance from wherever
                        // the finger left it, so a released gesture continues
                        // rather than snapping.
                        runOnJS(finishImeControl)(decision === 'commit');
                        hasRequestedIme.value = false;
                    }
                    if (decision === 'retract') {
                        // Retract is the one release that takes the throw velocity —
                        // it targets 0, which is off the top of the screen, so any
                        // overshoot happens out of sight. A CANCELLED pan carries no
                        // throw worth honouring, so that one just settles.
                        pull.value = withSpring(0, {
                            ...settleSpring,
                            velocity: success ? event.velocityY / SEARCH_PULL_PEEK_DISTANCE : 0,
                        });
                        return;
                    }
                    if (decision === 'commit') {
                        // Finish the motion the finger already started: carry reveal
                        // the rest of the way to 2, which IS full search — the same
                        // value the drag was driving, just completed. Focus (and so
                        // the keyboard) is raised by the provider once it lands.
                        //
                        // The haptic rides the spring's completion callback, not the
                        // release, because the physical event is the screen ARRIVING,
                        // not the finger leaving. That is the difference between
                        // feeling a drawer slam home and being buzzed for letting go.
                        // No haptic here. A spring's completion callback fires at
                        // NUMERICAL rest, which on a critically damped spring is a
                        // long tail past the point the motion looks finished — so
                        // the tick landed noticeably after everything had stopped.
                        // The landing tick lives in SearchPullSurface now, on the
                        // reveal crossing, which is when it actually looks landed.
                        pull.value = withSpring(2, openSpring);
                        // Tell the surface whether an IME session ever existed: a
                        // fling that skipped stage two never opened one, so the
                        // keyboard has to come up the ordinary way instead.
                        runOnJS(commitFullSearch)(!hadImeSession);
                        return;
                    }
                    // Settle back onto the seat. No velocity injected: the spring
                    // targets the rest line, so carrying momentum into it would push
                    // the bar past and back — a bounce by another name. No haptic
                    // either; the bar is returning to a detent it already clicked.
                    pull.value = withSpring(1, openSpring);
                })
                .onFinalize(() => {
                    'worklet';
                    /*
                     * The net under `onEnd`, which RNGH only calls for a pan that
                     * reached ACTIVE. `onFinalize` runs for every terminal
                     * transition, so this is the one place guaranteed to see the
                     * end of a touch sequence however it ended.
                     *
                     * It exists for one thing: NEVER leave an IME session held. A
                     * controller we take and don't give back leaves the keyboard
                     * under our thumb with nothing driving it — it stops answering
                     * focus, and search opens mute. `onEnd` clears the flag on the
                     * ordinary path, so this only ever fires on the paths that
                     * skipped it.
                     */
                    if (hasRequestedIme.value) {
                        runOnJS(finishImeControl)(false);
                        hasRequestedIme.value = false;
                    }
                    isSpringingBack.value = false;
                    hasActivated.value = false;
                })
        );
    }, [
        hasActivated,
        hasRequestedIme,
        hasSeated,
        isSpringingBack,
        nativeGesture,
        commitFullSearch,
        pull,
        reducedMotion,
        scrollY,
        startedAtTop,
        touchStartX,
        touchStartY,
    ]);

    // FlashList hosts hand this to `renderScrollComponent` so the native gesture
    // binds to the ACTUAL inner scroll view (FlashList's real scroller is not
    // reachable by wrapping the FlashList itself).
    //
    // It MUST be `Reanimated.ScrollView`, never a plain react-native `ScrollView`.
    // `scrollProps.onScroll` is a worklet from `useAnimatedScrollHandler`, and a
    // worklet handler only binds to an ANIMATED scroll component — on a plain one
    // it is accepted as a prop and then silently never fires. That failure is
    // invisible and total: `scrollY` stays pinned at 0 forever, so
    // `startedAtTop` reads true at EVERY scroll position, every downward drag
    // anywhere in the list summons search instead of scrolling, and once the
    // reveal passes SURFACE_OPEN_AT the scrim turns interactive and swallows the
    // page — leaving the list stranded wherever it was.
    const renderScrollComponent = useCallback(
        (props: ScrollViewProps) => (
            <GestureDetector gesture={nativeGesture}>
                <Reanimated.ScrollView {...props} />
            </GestureDetector>
        ),
        [nativeGesture],
    );

    // Re-tap the active tab → glide this list back to the top.
    useEffect(
        () =>
            subscribeTabReselected((reselectedTabId) => {
                if (reselectedTabId === tabId) {
                    scrollToTop();
                }
            }),
        [scrollToTop, tabId],
    );

    return useMemo(
        () => ({
            gesture,
            nativeGesture,
            renderScrollComponent,
            scrollProps: {
                onScroll: scrollHandler,
                // Kill the Android stretch glow so only OUR surface answers an
                // over-pull at the top.
                overScrollMode: 'never' as const,
                ref: setScrollable,
                scrollEventThrottle: 16,
            },
        }),
        [gesture, nativeGesture, renderScrollComponent, scrollHandler, setScrollable],
    );
};

export type SearchPullScrollProps = ReturnType<typeof useSearchPull>['scrollProps'];

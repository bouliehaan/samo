import { memo, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    interpolateColor,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { REDUCED_MOTION_SPRING } from '../../theme/layout';
import { styles } from '../../theme/styles';
import { useSearchPullContext } from './SearchPullContext';
import {
    SEARCH_PULL_COMMIT_AT,
    SEARCH_PULL_COMMIT_SPAN,
    SEARCH_PULL_FLING_VELOCITY,
    SEARCH_PULL_OPEN_SPRING,
    SEARCH_PULL_PEEK_AT,
    SEARCH_PULL_PEEK_DISTANCE,
    SEARCH_PULL_SCRIM_ACTIVATE_DY,
    SEARCH_PULL_SETTLE_SPRING,
    SEARCH_PULL_DISMISS_VELOCITY,
    SEARCH_PULL_SKIP_AT,
    SEARCH_PULL_SKIP_VELOCITY,
} from './search-pull-constants';
import {
    pullReveal,
    resolvePullRelease,
    revealTravel,
    revealVelocity,
} from './search-pull-physics';

/** Past this reveal the scrim becomes tappable. High enough that a mid-drag
 *  reveal never steals the pull's own finger. */
const SCRIM_OPEN_AT = 0.85;

/**
 * The dim behind the pull-down search tray.
 *
 * SPLIT FROM THE TRAY ON PURPOSE, and the split is structural rather than
 * cosmetic: this is PAGE-SIDE, the tray is CHROME. The tray is a BlurView, so
 * it cannot sit inside the content it samples — but the scrim must, or the
 * glass would show an undimmed page while everything around it went dark. So
 * the scrim renders inside the tray's `BlurTarget` (see App.tsx) and the tray
 * renders outside it, which is exactly the arrangement the two need.
 *
 * Both halves still read the one shared `pull` value, so nothing about the
 * motion is duplicated or has to stay in sync.
 */
export const SearchPullScrim = memo(function SearchPullScrim() {
    const { commitFullSearch, dismissSearchState, pull, reducedMotion, retract } =
        useSearchPullContext();
    const [isOpen, setIsOpen] = useState(false);

    /*
     * The page keeps darkening through stage two, so the screen is visibly still
     * responding to the finger after the bar has stopped moving.
     *
     * ANIMATED AS A COLOUR, NOT AS AN OPACITY, and the difference is a whole
     * offscreen layer per frame. This is a full-screen `View` with a child, so
     * `hasOverlappingRendering()` is true, and any alpha strictly between 0 and 1
     * makes Android `saveLayer()` the entire display, draw into it, then composite
     * it back — for every frame of a gesture where it is by definition never at 0
     * or 1. Fading a solid slab's own colour instead is a plain rect draw with an
     * alpha channel: same pixels, no layer, no readback.
     */
    const scrimStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            pull.value,
            [0, 1, 2],
            ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.55)', 'rgba(0, 0, 0, 0.88)'],
        ),
    }));

    // Below the threshold the scrim stays untouchable so the page underneath —
    // and the pull's own finger — are never intercepted.
    useAnimatedReaction(
        () => pull.value > SCRIM_OPEN_AT,
        (open, previous) => {
            if (open !== previous) {
                runOnJS(setIsOpen)(open);
            }
        },
    );

    /*
     * THE SEAT IS A POSITION, NOT A DEAD END.
     *
     * The moment the bar seats, this scrim goes interactive across the entire
     * display — and it sat above the page's own pan, so a seated bar left the
     * app with exactly one working input: a tap. You could not pull further into
     * search, could not drag it away, could not scroll the page behind it. Every
     * drag landed on a full-screen Pressable that only answers taps and did
     * nothing at all. Land there by accident and the app reads as frozen; that
     * is the whole of the "it just stops working altogether" report, and it was
     * the second half of the mis-seating bug — one bug put you in the state, the
     * other made it a room with no door.
     *
     * So the scrim drags. It picks up from wherever the surface is resting
     * (`revealTravel` converts that back into the finger travel that would have
     * put it there) and drives the SAME reveal through the SAME `pullReveal`, so
     * resuming a drag after a release is indistinguishable from never having let
     * go: further down brings search in, back up takes the bar away, and the
     * release resolves through the same three-way decision. The tap survives
     * untouched — the pan only claims the touch once it has actually moved.
     *
     * Reachable only at the seat, by construction: the full-search overlay draws
     * above this layer once committed, so nothing here can contend with the
     * results list's own scrolling.
     */
    const dragBase = useSharedValue(0);
    const scrimGesture = useMemo(() => {
        const openSpring = reducedMotion ? REDUCED_MOTION_SPRING : SEARCH_PULL_OPEN_SPRING;
        const settleSpring = reducedMotion ? REDUCED_MOTION_SPRING : SEARCH_PULL_SETTLE_SPRING;
        return Gesture.Pan()
            .activeOffsetY([-SEARCH_PULL_SCRIM_ACTIVATE_DY, SEARCH_PULL_SCRIM_ACTIVATE_DY])
            .onBegin(() => {
                'worklet';
                // Where the surface actually is, not where it settled — grabbing
                // one mid-spring picks it up from under the finger.
                dragBase.value = pull.value;
            })
            .onChange((event) => {
                'worklet';
                pull.value = pullReveal(
                    revealTravel(
                        dragBase.value,
                        SEARCH_PULL_PEEK_DISTANCE,
                        SEARCH_PULL_COMMIT_SPAN,
                    ) + event.translationY,
                    SEARCH_PULL_PEEK_DISTANCE,
                    SEARCH_PULL_COMMIT_SPAN,
                );
            })
            .onEnd((event, success) => {
                'worklet';
                const releaseReveal = pullReveal(
                    revealTravel(
                        dragBase.value,
                        SEARCH_PULL_PEEK_DISTANCE,
                        SEARCH_PULL_COMMIT_SPAN,
                    ) + event.translationY,
                    SEARCH_PULL_PEEK_DISTANCE,
                    SEARCH_PULL_COMMIT_SPAN,
                );
                const decision = !success
                    ? 'peek'
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
                /*
                 * THE MOTION IS SET HERE, ON THE UI THREAD, AND THE STATE FOLLOWS
                 * OVER `runOnJS`. Never the other way round: handing the whole
                 * release to a JS callback leaves the surface sitting exactly
                 * where the finger dropped it until that hop lands, which under a
                 * busy JS thread — search results rendering is precisely what is
                 * happening at that moment — is a visible stall in the middle of a
                 * throw.
                 */
                // Same rule as the page pan: the hand's momentum carries into
                // whichever spring answers, and the open spring clamps rather than
                // bouncing through its rest line. See search-pull-constants.
                const releaseVelocity = revealVelocity(
                    success ? event.velocityY : 0,
                    releaseReveal,
                    SEARCH_PULL_PEEK_DISTANCE,
                    SEARCH_PULL_COMMIT_SPAN,
                );
                if (decision === 'commit') {
                    pull.value = withSpring(2, { ...openSpring, velocity: releaseVelocity });
                    // `true`: no IME session is driven from this pan, so the
                    // keyboard has to come up the ordinary way, as it does for a
                    // tap on the resting bar.
                    runOnJS(commitFullSearch)(true);
                    return;
                }
                if (decision === 'retract') {
                    // Targets 0, off the top of the screen, so this spring stays
                    // unclamped — any overshoot is out of sight.
                    pull.value = withSpring(0, {
                        ...settleSpring,
                        velocity: releaseVelocity,
                    });
                    runOnJS(dismissSearchState)();
                    return;
                }
                pull.value = withSpring(1, { ...openSpring, velocity: releaseVelocity });
            });
    }, [commitFullSearch, dismissSearchState, dragBase, pull, reducedMotion]);

    return (
        /* Tap the dimmed page to put search away — the same animated retract
           every other dismissal funnels through. Drag it to carry the surface on
           in either direction (see `scrimGesture`). */
        <Reanimated.View
            pointerEvents={isOpen ? 'auto' : 'none'}
            style={[styles.searchPullScrim, scrimStyle]}
        >
            <GestureDetector gesture={scrimGesture}>
                <Pressable
                    accessibilityLabel="Dismiss search"
                    onPress={retract}
                    style={styles.searchPullScrimFill}
                />
            </GestureDetector>
        </Reanimated.View>
    );
});

import { type ReactNode, useCallback, useMemo, useRef } from 'react';
import {
    type AccessibilityRole,
    type AccessibilityState,
    StyleSheet,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    runOnJS,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { anticipation, easings, springs, timings } from '../theme/motion';

/**
 * The press-in delay, in ms — the window in which a touch is still allowed to
 * turn out to be the start of a scroll.
 *
 * This is deliberately NOT `Pressable`'s `unstable_pressDelay`. That one is a
 * JS `setTimeout`: it fires only once the JS thread gets around to it, so its
 * real cost is `delay + however long JS is busy`, and on a screen that is
 * windowing a list or decoding artwork that is routinely hundreds of ms. The
 * delay below is a Reanimated `withDelay` on the UI thread, so it is exactly
 * this many ms, every single time, no matter what JS is doing. Being
 * deterministic is what lets it be this short — the old JS delays had to be
 * 60-110ms to cover their own jitter.
 */
const PRESS_IN_DELAY_MS = 40;

/**
 * Finger travel, in dp, that reclassifies a touch as a scroll and retracts the
 * press state. Android's own `ViewConfiguration` touch slop is 8dp — the exact
 * distance at which a scroll container decides it is scrolling — so matching it
 * means the tile lets go on the same frame the list starts moving.
 *
 * This only ever cancels the VISUAL. Whether the tap itself still counts is
 * left to the gesture handler and the scroll container, exactly as before.
 */
const SCROLL_SLOP_DP = 8;
const SCROLL_SLOP_SQUARED = SCROLL_SLOP_DP * SCROLL_SLOP_DP;

/** Matches RN's `Pressable` default, so long-press timing is unchanged. */
const LONG_PRESS_MS = 500;

/**
 * Tap ceiling. Comfortably past `LONG_PRESS_MS` so the tap failing and the long
 * press activating can never land on the same frame and race for the visual.
 */
const TAP_MAX_DURATION_MS = 1200;

const DISABLED_ACCESSIBILITY_STATE = { disabled: true } as const;

/**
 * The row-highlight fill, and the `useAnimatedStyle` that drives it, in their own
 * component SO THAT BOTH ONLY EXIST WHEN A CALLER ASKED FOR A HIGHLIGHT.
 *
 * This used to be a second `useAnimatedStyle` in the body below, called
 * unconditionally as hooks must be, and rendered only when `highlight` was set.
 * Rows set it; tiles do not — and tiles are what the app is mostly made of. So
 * every tile on every grid, shelf and browse page carried a live Reanimated
 * mapper and view descriptor attached to no view, allocated and torn down on
 * every mount, driving an opacity nobody could see.
 *
 * Splitting it out is safe because `highlight` is a fixed property of a call site
 * (`presses.row` vs `presses.tile`), never something that toggles at runtime — so
 * this component's presence never changes across renders and no hook order moves.
 */
const PressHighlight = ({
    color,
    pressed,
    radius,
}: {
    color: string;
    pressed: SharedValue<number>;
    radius?: number;
}) => {
    // CLAMPED, because `pressed` now travels past 1 during a long-press
    // wind-up (see `anticipation` in theme/motion.ts). Unclamped, the highlight
    // would sit pinned at full opacity through the hold AND through the first
    // stretch of the release, so it would appear to hang before fading. That is
    // worst exactly where it matters most: a list row has scaleTo/dimTo of 1,
    // so this fill is the ONLY response it makes to a finger.
    const highlightStyle = useAnimatedStyle(() => ({
        opacity: Math.min(1, pressed.value),
    }));
    return (
        <Reanimated.View
            pointerEvents="none"
            style={[
                StyleSheet.absoluteFill,
                { backgroundColor: color },
                radius == null ? null : { borderRadius: radius },
                highlightStyle,
            ]}
        />
    );
};

export interface PressableScaleProps {
    accessibilityHint?: string;
    accessibilityLabel?: string;
    accessibilityRole?: AccessibilityRole;
    accessibilityState?: AccessibilityState;
    children?: ReactNode;
    /**
     * Set on fixed chrome — anything that cannot scroll under the finger
     * (transport controls, tab bar, sheet buttons). Skips the scroll-safety
     * delay and the drag-to-cancel, so the response lands on the first frame
     * after touch-down.
     */
    chrome?: boolean;
    disabled?: boolean;
    /** Resting → pressed opacity multiplier (default 0.9). */
    dimTo?: number;
    /**
     * Renders a fill of this colour that fades in under the content instead of
     * (or alongside) the sink — the row-highlight look. An overlay's opacity is
     * animated rather than the row's `backgroundColor` so the 60fps contract in
     * theme/motion.ts still holds.
     */
    highlight?: string;
    /** Radius for the `highlight` fill, so it doesn't square off a rounded row. */
    highlightRadius?: number;
    hitSlop?: number;
    onLongPress?: () => void;
    onPress?: () => void;
    /** Fired at touch-down on the JS thread. For prefetch — never for visuals. */
    onPressIn?: () => void;
    /**
     * Drive an externally-owned 0→1 press progress instead of a private one, so
     * a caller can fold the press into an animation of its own (the tab bar
     * multiplies it into the active-tab lift). Pair it with `scaleTo`/`dimTo` of
     * 1 when the caller wants to render the whole response itself.
     */
    pressProgress?: SharedValue<number>;
    /** Resting → pressed scale (default 0.96). Pass 1 to only dim/highlight. */
    scaleTo?: number;
    style?: StyleProp<ViewStyle>;
}

/**
 * The app's one press surface — it sinks and dims under the finger, then
 * springs back on release.
 *
 * WHY THIS IS NOT A `Pressable`
 *
 * `Pressable` routes every press through the JS thread twice over. The touch
 * has to reach a JS callback before anything can start, and the usual way of
 * showing the state — `style={({ pressed }) => ...}` — is a `setState`, so the
 * "animation" is really a React render, a Yoga pass and a mount, queued behind
 * whatever else JS is doing. On an idle screen that is invisible. On a screen
 * that is windowing a FlashList, decoding artwork or deriving a catalog sync
 * it is tens to hundreds of ms, and it VARIES — which is what a delayed
 * animation actually feels like from the outside: not slow, but unpredictable.
 *
 * Here the entire press lifecycle is worklets on the UI thread. Touch-down
 * starts the sink without JS being involved at all, so it lands on the next
 * frame whether or not JS is busy, and it costs no render — the shared value
 * feeds `useAnimatedStyle` directly (tenet 2 in theme/motion.ts). The JS thread
 * is only reached for the ACTION, after the surface has already answered.
 */
export const PressableScale = ({
    accessibilityHint,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    children,
    chrome,
    disabled,
    dimTo = 0.9,
    highlight,
    highlightRadius,
    hitSlop,
    onLongPress,
    onPress,
    onPressIn,
    pressProgress,
    scaleTo = 0.96,
    style,
}: PressableScaleProps) => {
    const ownPressProgress = useSharedValue(0);
    const pressed = pressProgress ?? ownPressProgress;
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    /** The touch became a drag — the press state has already been retracted. */
    const abandoned = useSharedValue(false);
    /** The long press fired, so release must not also fire a press. */
    const longPressed = useSharedValue(false);

    // The gesture is built once and kept across renders — a recycled FlashList
    // cell must not tear down and re-attach handlers on every pass. Callbacks
    // are read through a ref so a fresh closure per render never invalidates it.
    const latest = useRef({ onLongPress, onPress, onPressIn });
    latest.current = { onLongPress, onPress, onPressIn };

    const invokePress = useCallback(() => latest.current.onPress?.(), []);
    const invokeLongPress = useCallback(() => latest.current.onLongPress?.(), []);
    const invokePressIn = useCallback(() => latest.current.onPressIn?.(), []);

    const hasLongPress = onLongPress != null;

    const gesture = useMemo(() => {
        const scrollSafe = chrome !== true;
        // RNGH takes hit slop per handler rather than on the composition. The
        // sign convention matches RN's (positive grows the target), as does the
        // Android limit that growth past the parent's bounds has no effect.
        const slop = hitSlop ?? 0;

        const tap = Gesture.Tap()
            .enabled(disabled !== true)
            .hitSlop(slop)
            // WITHOUT THIS A DRAG IS STILL A TAP. Gesture Handler's native tap
            // only rejects on distance when one of maxDeltaX/maxDeltaY/maxDist
            // is set — all three default to a sentinel its `shouldFail()` skips
            // — so with only a duration bound, ANY lift inside
            // TAP_MAX_DURATION_MS counted as a tap no matter how far the finger
            // had travelled. Putting a finger down on a tile, scrolling, and
            // lifting therefore opened the tile. The `abandoned` tracking below
            // caught the same movement but only drove the SINK, so the surface
            // correctly un-pressed itself and then fired anyway.
            //
            // Worst exactly where it was reported — the podcast and audiobook
            // grids — not because they use a different component (they are the
            // same PressableScale, same preset) but because a dense grid has no
            // dead space: every scroll necessarily begins on a tile, where a
            // shelf-and-header page gives the finger somewhere harmless to land.
            //
            // Same 8dp as the worklet slop, and the same value as Android's own
            // `ViewConfiguration` touch slop, so a press that drifts under the
            // platform's own definition of "still a tap" still registers.
            .maxDistance(SCROLL_SLOP_DP)
            .maxDuration(TAP_MAX_DURATION_MS)
            .onTouchesDown((event) => {
                'worklet';
                const touch = event.allTouches[0];
                if (touch) {
                    startX.value = touch.absoluteX;
                    startY.value = touch.absoluteY;
                }
                abandoned.value = false;
                longPressed.value = false;
                // The whole point: this line runs on the UI thread, on the
                // frame the finger lands, with no JS round trip in front of it.
                // Press in, then — only where a long-press exists — keep
                // loading past 1 across the hold. `anticipation.peak` extends
                // the SAME linear depth the styles already read, so there is no
                // second scale to keep in sync, and a tap never sees it because
                // a tap lifts long before `anticipation.holdMs` elapses.
                const pressIn = hasLongPress
                    ? withSequence(
                          withTiming(1, timings.press),
                          withTiming(anticipation.peak, {
                              duration: anticipation.holdMs,
                              easing: easings.standard,
                          }),
                      )
                    : withTiming(1, timings.press);
                pressed.value = scrollSafe
                    ? withDelay(PRESS_IN_DELAY_MS, pressIn)
                    : pressIn;
                runOnJS(invokePressIn)();
            })
            .onTouchesMove((event) => {
                'worklet';
                if (!scrollSafe || abandoned.value) {
                    return;
                }
                const touch = event.allTouches[0];
                if (!touch) {
                    return;
                }
                const dx = touch.absoluteX - startX.value;
                const dy = touch.absoluteY - startY.value;
                if (dx * dx + dy * dy < SCROLL_SLOP_SQUARED) {
                    return;
                }
                // A scroll, not a press. Retracting also cancels a press-in
                // still sitting in its delay, so a flick never flashes a tile.
                abandoned.value = true;
                pressed.value = withSpring(0, springs.release);
            })
            .onEnd(() => {
                'worklet';
                if (longPressed.value) {
                    return;
                }
                // Belt to maxDistance's braces. The native handler measures in
                // px converted from dp, this worklet measures absolute
                // coordinates, and the two can disagree by a hair right on the
                // boundary — but only one of them is allowed to decide the tile
                // opens. If this surface already judged the touch a scroll, it
                // does not fire, whatever the handler concluded.
                if (abandoned.value) {
                    return;
                }
                runOnJS(invokePress)();
            })
            .onFinalize((_event, success) => {
                'worklet';
                if (longPressed.value) {
                    return;
                }
                if (success && !abandoned.value && pressed.value < 0.01) {
                    // Lifted inside the scroll-safety window, so the sink never
                    // became visible. Play it anyway — a tap that draws no
                    // response at all reads as a dropped tap.
                    pressed.value = withSequence(
                        withTiming(1, timings.press),
                        withSpring(0, springs.release),
                    );
                    return;
                }
                pressed.value = withSpring(0, springs.release);
            });

        const longPress = Gesture.LongPress()
            .enabled(disabled !== true && hasLongPress)
            .hitSlop(slop)
            .minDuration(LONG_PRESS_MS)
            .onStart(() => {
                'worklet';
                longPressed.value = true;
                // Hand the surface back as the menu takes over, rather than
                // holding it sunk under a scrim for as long as the finger stays.
                pressed.value = withSpring(0, springs.release);
                runOnJS(invokeLongPress)();
            });

        return Gesture.Simultaneous(longPress, tap);
    }, [
        abandoned,
        chrome,
        disabled,
        hasLongPress,
        hitSlop,
        invokeLongPress,
        invokePress,
        invokePressIn,
        longPressed,
        pressed,
        startX,
        startY,
    ]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: 1 - pressed.value * (1 - dimTo),
        transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    }));

    return (
        <GestureDetector gesture={gesture}>
            <Reanimated.View
                accessibilityHint={accessibilityHint}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole={accessibilityRole}
                accessibilityState={
                    disabled
                        ? { ...accessibilityState, ...DISABLED_ACCESSIBILITY_STATE }
                        : accessibilityState
                }
                accessible
                // TalkBack activates through the accessibility API, which never
                // reaches a gesture handler — without this the app would be
                // unusable with a screen reader.
                onAccessibilityTap={invokePress}
                style={[style, animatedStyle]}
            >
                {highlight ? (
                    <PressHighlight
                        color={highlight}
                        pressed={pressed}
                        radius={highlightRadius}
                    />
                ) : null}
                {children}
            </Reanimated.View>
        </GestureDetector>
    );
};

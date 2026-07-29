import { memo, useEffect } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Reanimated, {
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { usePresenceTransition } from '../hooks/use-presence-transition';
import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
import { type SheetLayerEntry, useSheetLayer } from '../state/sheet-layer';
import { durations, springs, timings, travel } from '../theme/motion';
import { styles } from '../theme/styles';

/**
 * One registered sheet, drawn. This is the body the old Modal-based MotionSheet
 * had, minus the window: same physics, same two shapes, same presence.
 *
 * Both directions ride ONE progress value on the UI thread, so backdrop and
 * sheet cannot drift apart, and both animate transform + opacity ONLY.
 */
const SheetSurface = memo(function SheetSurface({
    backdropStyle,
    children,
    keyboardOffset,
    onRequestClose,
    sheetStyle,
    variant,
    visible,
}: Omit<SheetLayerEntry, 'id'> & { keyboardOffset: SharedValue<number> }) {
    const reducedMotion = useReducedMotionPreference();
    const { isMounted, progress } = usePresenceTransition(visible, {
        enterMs: durations.scrim,
        exitMs: durations.screenExit,
    });

    // The sheet's own arrival is a spring rather than the presence hook's
    // timing curve: a menu wants a little mass on the way in. The scrim stays
    // on the timing curve, because a springing backdrop reads as a flicker.
    //
    // Driven from an effect, NOT from a render-body comparison against a
    // previous-value shared value. Reading `.value` during render is unsound in
    // Reanimated (it warns, loudly, and the read races the UI thread), and
    // STARTING an animation during render is worse — React may re-render or
    // discard that pass, so the spring can be launched twice or launched for a
    // commit that never happens.
    const settle = useSharedValue(visible ? 1 : 0);
    useEffect(() => {
        settle.value = reducedMotion
            ? visible
                ? 1
                : 0
            : visible
              ? withSpring(1, springs.sheet)
              : withTiming(0, timings.screenExit);
    }, [reducedMotion, settle, visible]);

    // The hardware back button. `Modal` used to give this for free via
    // `onRequestClose`; an in-tree surface has to ask for it. Registered only
    // while visible, and listeners fire most-recent-first, so the topmost open
    // sheet is the one that closes.
    useEffect(() => {
        if (!visible) {
            return;
        }
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            onRequestClose();
            return true;
        });
        return () => subscription.remove();
    }, [onRequestClose, visible]);

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    const sheetAnimatedStyle = useAnimatedStyle(() => {
        const t = settle.value;
        // `keyboardOffset` is already negative while the IME is up, so adding it
        // lifts the sheet clear of the keyboard. It has to be carried here, on
        // the sheet's own transform, because KeyboardProvider takes the window
        // out of `adjustResize` — nothing resizes under the IME any more, and
        // the native Modal window that used to do this for free is gone. A
        // transform rather than padding keeps it off the layout path (motion.ts
        // rule 1), and the scrim deliberately does NOT move, so the dimmed page
        // still covers the screen behind a raised sheet.
        const lift = keyboardOffset.value;
        return variant === 'bottom'
            ? {
                  opacity: progress.value,
                  transform: [{ translateY: (1 - t) * travel.sheet + lift }],
              }
            : {
                  opacity: progress.value,
                  transform: [
                      { translateY: (1 - t) * travel.screen + lift },
                      // Scale from just under 1 — a menu growing from 0.9 reads
                      // as a popup toy; 0.96 reads as it settling into focus.
                      { scale: 0.96 + t * 0.04 },
                  ],
              };
    });

    if (!isMounted) {
        return null;
    }

    return (
        <Reanimated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[backdropStyle, backdropAnimatedStyle]}
        >
            <Pressable
                accessibilityLabel="Close"
                onPress={onRequestClose}
                style={styles.sheetScrimPress}
            />
            <Reanimated.View style={[sheetStyle, sheetAnimatedStyle]}>{children}</Reanimated.View>
        </Reanimated.View>
    );
});

/**
 * Draws every registered sheet, at the top of the app root.
 *
 * Must be mounted INSIDE every app-level provider — the sheets' elements are
 * created at their call sites but MOUNT here, so this is where their context is
 * resolved — and as the last child of the root with a zIndex above the tab bar
 * and player dock, which is the whole reason sheets used to need a window.
 *
 * `box-none` so the layer itself never eats a touch: with nothing open the
 * registered surfaces all render null, and an open sheet's own backdrop is what
 * blocks the page beneath it.
 */
export const SheetPortalHost = memo(function SheetPortalHost() {
    const sheets = useSheetLayer();
    // Subscribed once for the whole layer rather than per sheet — it is the same
    // IME either way, and only one sheet can hold the focus that raised it.
    const { height: keyboardOffset } = useReanimatedKeyboardAnimation();

    return (
        <View pointerEvents="box-none" style={styles.sheetLayer}>
            {sheets.map(({ id, ...entry }) => (
                <SheetSurface {...entry} key={id} keyboardOffset={keyboardOffset} />
            ))}
        </View>
    );
});

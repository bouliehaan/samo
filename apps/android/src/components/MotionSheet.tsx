import { type ReactNode, useEffect } from 'react';
import { Modal, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { usePresenceTransition } from '../hooks/use-presence-transition';
import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
import { durations, springs, timings, travel } from '../theme/motion';
import { styles } from '../theme/styles';

/**
 * The one way a sheet or menu enters and leaves in this app.
 *
 * Before this, nine surfaces presented nine ways: five `animationType="fade"`,
 * three `animationType="slide"`, and the context menu hand-rolling the legacy
 * `Animated` API with its own spring constants. `fade` and `slide` are the
 * PLATFORM's generic modal transitions — they know nothing about this app's
 * motion, so a sort menu and the context menu that open from adjacent rows
 * arrived with visibly different weight. Worse, both are opacity/position-only
 * and neither has any spring in it, which is what made the menus feel pasted on
 * rather than lifted out.
 *
 * Two shapes, one physics:
 * - `menu` — scales and rises into place. For surfaces anchored to the middle
 *   of the screen (sort, context actions, info panels).
 * - `bottom` — rises from the bottom edge. For surfaces that belong to the
 *   thumb (output picker, sleep timer, playlist edit).
 *
 * Both ride ONE progress value on the UI thread, so backdrop and sheet cannot
 * drift apart, and both animate transform + opacity ONLY.
 *
 * Exit animations require the native Modal window to outlive `visible`, which
 * is why presence is handled here rather than by each caller: `<Modal visible>`
 * tears the window down on the same frame it flips, so a sheet whose exit is
 * driven by its own prop can never play one.
 */
export const MotionSheet = ({
    backdropStyle,
    children,
    onRequestClose,
    sheetStyle,
    variant = 'menu',
    visible,
}: {
    /** Style for the full-screen scrim behind the sheet. */
    backdropStyle?: StyleProp<ViewStyle>;
    children: ReactNode;
    /** Back button, and a tap on the scrim. */
    onRequestClose: () => void;
    /** Style for the sheet surface itself. */
    sheetStyle?: StyleProp<ViewStyle>;
    variant?: 'bottom' | 'menu';
    visible: boolean;
}) => {
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

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    const sheetAnimatedStyle = useAnimatedStyle(() => {
        const t = settle.value;
        return variant === 'bottom'
            ? {
                  opacity: progress.value,
                  transform: [{ translateY: (1 - t) * travel.sheet }],
              }
            : {
                  opacity: progress.value,
                  transform: [
                      { translateY: (1 - t) * travel.screen },
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
        <Modal
            // `none`: the transition is ours. Leaving the platform default on
            // would run the OS animation UNDERNEATH this one — two curves on
            // the same surface, which is the double-bounce it used to have.
            animationType="none"
            onRequestClose={onRequestClose}
            transparent
            visible
        >
            <Reanimated.View
                pointerEvents={visible ? 'auto' : 'none'}
                style={[backdropStyle, backdropAnimatedStyle]}
            >
                <Pressable
                    accessibilityLabel="Close"
                    onPress={onRequestClose}
                    style={styles.sheetScrimPress}
                />
                <Reanimated.View style={[sheetStyle, sheetAnimatedStyle]}>
                    {children}
                </Reanimated.View>
            </Reanimated.View>
        </Modal>
    );
};

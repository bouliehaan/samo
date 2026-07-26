import { type ReactNode } from 'react';
import { Pressable } from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { springs, timings } from '../theme/motion';
import { styles } from '../theme/styles';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

/** Pressed scale. Shallower than PressableScale's 0.96-on-a-tile: these are
 *  small round controls, and a deep sink on a 44dp circle reads as a wobble. */
const PRESS_SCALE = 0.9;
const PRESS_DIM = 0.12;

/**
 * A player transport control that answers the finger.
 *
 * Deliberately NOT PressableScale, for one reason: that component carries an
 * `unstable_pressDelay` of 110ms so a thumb starting a scroll on a tile never
 * flashes a press state. Transport controls live on fixed chrome that never
 * scrolls, so the delay buys nothing here and costs the thing that matters most
 * on a play button — the response landing on the same frame as the touch.
 * Play/pause is the single most-pressed control in the app; 110ms of dead time
 * before it acknowledges a tap is exactly the lag people describe as an app
 * feeling "cheap".
 */
export const PlayerIconButton = ({
    accessibilityLabel,
    children,
    compact,
    onPress,
    primary,
    tint,
}: {
    accessibilityLabel: string;
    children: ReactNode;
    compact?: boolean;
    onPress: () => void;
    primary?: boolean;
    tint?: string;
}) => {
    const pressed = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: 1 - pressed.value * PRESS_DIM,
        transform: [{ scale: 1 - pressed.value * (1 - PRESS_SCALE) }],
    }));

    return (
        <AnimatedPressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            onPress={onPress}
            onPressIn={() => {
                pressed.value = withTiming(1, timings.press);
            }}
            onPressOut={() => {
                pressed.value = withSpring(0, springs.release);
            }}
            style={[
                styles.playerControlButton,
                compact && styles.playerControlButtonCompact,
                primary && styles.playerControlButtonPrimary,
                primary && tint ? { backgroundColor: tint } : null,
                animatedStyle,
            ]}
        >
            {children}
        </AnimatedPressable>
    );
};

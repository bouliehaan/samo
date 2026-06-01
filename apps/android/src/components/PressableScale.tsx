import { type ReactNode } from 'react';
import {
    type AccessibilityRole,
    type GestureResponderEvent,
    Pressable,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

const PRESS_IN = { duration: 90 } as const;
const PRESS_OUT = { damping: 15, mass: 0.5, stiffness: 320 } as const;
// Wait a beat before reacting so a thumb that's actually starting a scroll
// (the gesture gets claimed by the list) never triggers the press animation.
const PRESS_DELAY_MS = 110;

/**
 * A Pressable that physically responds to touch — it sinks slightly and dims on
 * press, then springs back on release. This is the tactile "it's a real object
 * in your hand" feel; use it for tiles, cards, and primary buttons.
 */
export const PressableScale = ({
    accessibilityHint,
    accessibilityLabel,
    accessibilityRole,
    children,
    disabled,
    hitSlop,
    onLongPress,
    onPress,
    onPressIn,
    scaleTo = 0.96,
    style,
}: {
    accessibilityHint?: string;
    accessibilityLabel?: string;
    accessibilityRole?: AccessibilityRole;
    children: ReactNode;
    disabled?: boolean;
    hitSlop?: number;
    onLongPress?: (event: GestureResponderEvent) => void;
    onPress?: (event: GestureResponderEvent) => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    /** Resting → pressed scale (default 0.96). */
    scaleTo?: number;
    style?: StyleProp<ViewStyle>;
}) => {
    const pressed = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: 1 - pressed.value * 0.1,
        transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    }));

    return (
        <AnimatedPressable
            accessibilityHint={accessibilityHint}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole}
            disabled={disabled}
            hitSlop={hitSlop}
            onLongPress={onLongPress}
            onPress={onPress}
            onPressIn={(event) => {
                pressed.value = withTiming(1, PRESS_IN);
                onPressIn?.(event);
            }}
            onPressOut={() => {
                pressed.value = withSpring(0, PRESS_OUT);
            }}
            style={[style, animatedStyle]}
            unstable_pressDelay={PRESS_DELAY_MS}
        >
            {children}
        </AnimatedPressable>
    );
};

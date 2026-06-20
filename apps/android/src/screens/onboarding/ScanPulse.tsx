import { useEffect } from 'react';
import { View } from 'react-native';
import Reanimated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { colors } from '../../theme/tokens';

/**
 * A radar-style pulse: concentric gold rings that expand and fade outward, with
 * a steady glowing core. Reads as "actively listening for your server".
 */
export const ScanPulse = ({
    size = 132,
    color = colors.accent,
    active = true,
}: {
    size?: number;
    color?: string;
    active?: boolean;
}) => {
    return (
        <View
            style={{
                alignItems: 'center',
                height: size,
                justifyContent: 'center',
                width: size,
            }}
        >
            <Ring color={color} delay={0} size={size} active={active} />
            <Ring color={color} delay={900} size={size} active={active} />
            <Ring color={color} delay={1800} size={size} active={active} />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: size * 0.12,
                    height: size * 0.24,
                    opacity: 0.95,
                    width: size * 0.24,
                }}
            />
        </View>
    );
};

const RING_PERIOD_MS = 2700;

const Ring = ({
    size,
    color,
    delay,
    active,
}: {
    size: number;
    color: string;
    delay: number;
    active: boolean;
}) => {
    const progress = useSharedValue(0);

    useEffect(() => {
        if (!active) {
            progress.value = 0;
            return;
        }
        progress.value = withDelay(
            delay,
            withRepeat(
                withTiming(1, { duration: RING_PERIOD_MS, easing: Easing.out(Easing.quad) }),
                -1,
                false,
            ),
        );
        return () => {
            cancelAnimation(progress);
        };
    }, [active, delay, progress]);

    const style = useAnimatedStyle(() => {
        'worklet';
        const scale = 0.28 + progress.value * 0.72;
        const opacity = (1 - progress.value) * 0.5;
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    return (
        <Reanimated.View
            style={[
                {
                    borderColor: color,
                    borderRadius: size / 2,
                    borderWidth: 1.5,
                    height: size,
                    position: 'absolute',
                    width: size,
                },
                style,
            ]}
        />
    );
};

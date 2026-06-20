import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
    cancelAnimation,
    Easing,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { colors } from '../../theme/tokens';

/**
 * A field of softly pulsing dots arranged on a grid, with a ripple that travels
 * outward from a focal point — the "antigravity" waving-matrix look. The whole
 * grid is driven by a SINGLE shared clock; each dot derives its own scale and
 * opacity from its precomputed distance to the focus, so the per-frame work is a
 * handful of cheap math ops per dot on the UI thread (no JS bridge crossings).
 *
 * Purely decorative. Pointer-events are off so it never intercepts touches.
 */

export interface WaveDotsFieldProps {
    /** Overall field size. */
    width: number;
    height: number;
    /** Dot tint. Defaults to the gold hallmark. */
    color?: string;
    /** 0..1 focal point of the ripple, fraction of width/height. */
    focusX?: number;
    focusY?: number;
    /** Seconds for one ripple cycle. */
    period?: number;
    /** Freeze to a calm static state (reduced-motion). */
    reducedMotion?: boolean;
    /** Multiplies the resting brightness of the whole field. */
    intensity?: number;
}

const DOT_SIZE = 5;
// Spacing is derived to keep the dot count bounded (≈9×16) on any screen, so the
// UI thread never animates more than ~150 worklets at once.
const MIN_SPACING = 30;

interface DotSpec {
    left: number;
    top: number;
    /** Normalised distance (0..1) from the ripple focus. */
    dist: number;
}

const buildGrid = (
    width: number,
    height: number,
    focusX: number,
    focusY: number,
): DotSpec[] => {
    const spacing = Math.max(MIN_SPACING, Math.min(width / 9, height / 16));
    const cols = Math.max(2, Math.floor(width / spacing));
    const rows = Math.max(2, Math.floor(height / spacing));
    // Centre the grid in the field.
    const offsetX = (width - (cols - 1) * spacing) / 2;
    const offsetY = (height - (rows - 1) * spacing) / 2;

    const fx = focusX * width;
    const fy = focusY * height;
    const maxDist = Math.hypot(width, height);

    const dots: DotSpec[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = offsetX + c * spacing;
            const y = offsetY + r * spacing;
            const dist = Math.hypot(x - fx, y - fy) / maxDist;
            dots.push({ left: x - DOT_SIZE / 2, top: y - DOT_SIZE / 2, dist });
        }
    }
    return dots;
};

const Dot = ({
    spec,
    clock,
    color,
    intensity,
}: {
    spec: DotSpec;
    clock: SharedValue<number>;
    color: string;
    intensity: number;
}) => {
    const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        // A wave that travels OUTWARD from the focus: subtract distance from the
        // phase so nearer dots crest first. clock loops 0..1; sin is seamless
        // across the wrap (sin(2π)=sin(0)).
        const wave = Math.sin((clock.value - spec.dist * 1.1) * Math.PI * 2);
        const lift = wave * 0.5 + 0.5; // 0..1
        const scale = 0.45 + lift * 0.75;
        const opacity = (0.12 + lift * 0.5) * intensity;
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    return (
        <Reanimated.View
            style={[
                {
                    backgroundColor: color,
                    borderRadius: DOT_SIZE / 2,
                    height: DOT_SIZE,
                    left: spec.left,
                    position: 'absolute',
                    top: spec.top,
                    width: DOT_SIZE,
                },
                animatedStyle,
            ]}
        />
    );
};

export const WaveDotsField = ({
    width,
    height,
    color = colors.accent,
    focusX = 0.5,
    focusY = 0.42,
    period = 3.8,
    reducedMotion = false,
    intensity = 1,
}: WaveDotsFieldProps) => {
    const dots = useMemo(
        () => buildGrid(width, height, focusX, focusY),
        [width, height, focusX, focusY],
    );

    const clock = useSharedValue(0);

    useEffect(() => {
        if (reducedMotion) {
            clock.value = 0.25;
            return;
        }
        clock.value = withRepeat(
            withTiming(1, { duration: period * 1000, easing: Easing.linear }),
            -1,
            false,
        );
        return () => {
            cancelAnimation(clock);
        };
    }, [clock, period, reducedMotion]);

    if (width <= 0 || height <= 0) {
        return null;
    }

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
            {dots.map((spec, index) => (
                <Dot
                    clock={clock}
                    color={color}
                    intensity={intensity}
                    key={index}
                    spec={spec}
                />
            ))}
        </View>
    );
};

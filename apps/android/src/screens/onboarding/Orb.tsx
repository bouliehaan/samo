import { useEffect } from 'react';
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '../../theme/tokens';

/**
 * A glossy 3D orb — a shaded sphere with a soft halo and a specular highlight,
 * gently breathing. Replaces the old flat 2D radar pulse for the "looking for
 * your server" + "setting up your library" states. The illusion of depth comes
 * from the off-centre (top-left) radial gradient + the bright spec highlight; it
 * breathes (and glows a touch brighter) while active.
 */
export const Orb = ({
    size = 132,
    active = true,
}: {
    size?: number;
    active?: boolean;
}) => {
    const breathe = useSharedValue(1);
    const glow = useSharedValue(active ? 1 : 0.55);

    useEffect(() => {
        breathe.value = withRepeat(
            withTiming(active ? 1.05 : 1.02, {
                duration: active ? 2600 : 4200,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            true,
        );
    }, [active, breathe]);

    useEffect(() => {
        glow.value = withTiming(active ? 1 : 0.5, { duration: 600 });
        if (active) {
            glow.value = withRepeat(
                withTiming(0.7, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
                -1,
                true,
            );
        }
    }, [active, glow]);

    const bodyStyle = useAnimatedStyle(() => ({
        transform: [{ scale: breathe.value }],
    }));
    const glowStyle = useAnimatedStyle(() => ({
        opacity: glow.value,
        transform: [{ scale: 0.9 + glow.value * 0.35 }],
    }));

    return (
        <Reanimated.View
            style={[
                { alignItems: 'center', height: size, justifyContent: 'center', width: size },
                bodyStyle,
            ]}
        >
            {/* Soft outer aura — a separate animated layer so it can pulse on its
                own cadence behind the sphere. */}
            <Reanimated.View
                style={[
                    {
                        backgroundColor: colors.accent,
                        borderRadius: size / 2,
                        height: size * 0.82,
                        opacity: 0.18,
                        position: 'absolute',
                        width: size * 0.82,
                    },
                    glowStyle,
                ]}
            />
            <Svg height={size} viewBox="0 0 120 120" width={size}>
                <Defs>
                    {/* Inner halo glued to the sphere edge. */}
                    <RadialGradient cx="50%" cy="50%" id="orbHalo" r="50%">
                        <Stop offset="0.45" stopColor={colors.accent} stopOpacity={0} />
                        <Stop offset="0.62" stopColor={colors.accent} stopOpacity={0.34} />
                        <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
                    </RadialGradient>
                    {/* Sphere body: highlight up-left, deep gold at the lower-right rim. */}
                    <RadialGradient cx="40%" cy="36%" id="orbBody" r="68%">
                        <Stop offset="0" stopColor={colors.accentBright} />
                        <Stop offset="0.52" stopColor={colors.accent} />
                        <Stop offset="1" stopColor="#7f6f49" />
                    </RadialGradient>
                    {/* Specular gloss. */}
                    <RadialGradient cx="50%" cy="50%" id="orbSpec" r="50%">
                        <Stop offset="0" stopColor="#ffffff" stopOpacity={0.7} />
                        <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx="60" cy="60" fill="url(#orbHalo)" r="58" />
                <Circle cx="60" cy="60" fill="url(#orbBody)" r="34" />
                {/* Glassy rim. */}
                <Circle
                    cx="60"
                    cy="60"
                    fill="none"
                    r="34"
                    stroke="#ffffff"
                    strokeOpacity={0.12}
                    strokeWidth={0.75}
                />
                {/* Top-left highlight that sells the sphere. */}
                <Ellipse cx="49" cy="46" fill="url(#orbSpec)" rx="13" ry="9" />
            </Svg>
        </Reanimated.View>
    );
};

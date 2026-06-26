import { useEffect, useMemo } from 'react';
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '../../theme/tokens';

/**
 * An organic particle orb: a field of fine points, dense and bright at the core
 * and thinning to a sparse rim, sitting inside a soft warm glow. Two layers
 * counter-rotate for parallax depth and the whole thing breathes — so it reads
 * as a living, ethereal sphere of particles rather than a 3D ball. Replaces the
 * old glossy gold sphere. Distribution is radially symmetric (density biased to
 * the centre) so the slow rotation never reveals a flat disc.
 */

const VIEWBOX = 120;
const CENTER = VIEWBOX / 2;
const RADIUS = 52;

// Mostly ethereal warm-white; gold lives only in the faint core glow + a few
// accent motes, so it's warm and on-brand without the gold-ball look.
const PARTICLE_CREAM = '#F3ECDA';
const PARTICLE_SPARKLE = '#FFFDF6';
const ACCENT_FRACTION = 0.1;
const SPARKLE_FRACTION = 0.07;

interface Particle {
    cx: number;
    cy: number;
    fill: string;
    o: number;
    r: number;
}

const buildParticleField = (
    count: number,
    opts: { opacityScale: number; sizeBoost: number },
): Particle[] => {
    const out: Particle[] = [];
    for (let i = 0; i < count; i += 1) {
        // pow > 0.5 biases the radius toward the centre → a glowing core that
        // thins to the rim.
        const rad = RADIUS * Math.pow(Math.random(), 0.85);
        const ang = Math.random() * Math.PI * 2;
        const proximity = 1 - rad / RADIUS; // 1 at centre, 0 at rim
        const sparkle = Math.random() < SPARKLE_FRACTION;
        const accent = !sparkle && Math.random() < ACCENT_FRACTION;
        out.push({
            cx: CENTER + Math.cos(ang) * rad,
            cy: CENTER + Math.sin(ang) * rad,
            fill: sparkle ? PARTICLE_SPARKLE : accent ? colors.accent : PARTICLE_CREAM,
            o: Math.min(
                0.92,
                (0.1 + proximity * 0.72) * opts.opacityScale * (0.6 + Math.random() * 0.5),
            ),
            r: (0.4 + proximity * opts.sizeBoost) * (sparkle ? 1.7 : 0.7 + Math.random() * 0.6),
        });
    }
    return out;
};

const ParticleLayer = ({ particles }: { particles: Particle[] }) => (
    <Svg height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} width="100%">
        {particles.map((p, i) => (
            <Circle cx={p.cx} cy={p.cy} fill={p.fill} fillOpacity={p.o} key={i} r={p.r} />
        ))}
    </Svg>
);

export const Orb = ({ size = 132, active = true }: { active?: boolean; size?: number }) => {
    const back = useMemo(() => buildParticleField(70, { opacityScale: 0.55, sizeBoost: 1.0 }), []);
    const front = useMemo(() => buildParticleField(95, { opacityScale: 1, sizeBoost: 1.7 }), []);

    const breathe = useSharedValue(1);
    const spinFront = useSharedValue(0);
    const spinBack = useSharedValue(0);
    const glow = useSharedValue(active ? 1 : 0.55);

    useEffect(() => {
        breathe.value = withRepeat(
            withTiming(active ? 1.045 : 1.02, {
                duration: active ? 2800 : 4400,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            true,
        );
    }, [active, breathe]);

    useEffect(() => {
        spinFront.value = withRepeat(
            withTiming(360, { duration: active ? 34000 : 64000, easing: Easing.linear }),
            -1,
            false,
        );
        spinBack.value = withRepeat(
            withTiming(-360, { duration: active ? 52000 : 90000, easing: Easing.linear }),
            -1,
            false,
        );
    }, [active, spinBack, spinFront]);

    useEffect(() => {
        glow.value = active
            ? withRepeat(
                  withTiming(0.72, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
                  -1,
                  true,
              )
            : withTiming(0.5, { duration: 600 });
    }, [active, glow]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: active ? 1 : 0.8,
        transform: [{ scale: breathe.value }],
    }));
    const frontStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spinFront.value}deg` }] }));
    const backStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spinBack.value}deg` }] }));
    const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

    const layerStyle = { height: size, position: 'absolute' as const, width: size };

    return (
        <Reanimated.View
            style={[
                { alignItems: 'center', height: size, justifyContent: 'center', width: size },
                containerStyle,
            ]}
        >
            {/* Soft warm core the particles glow inside. */}
            <Reanimated.View style={[layerStyle, glowStyle]}>
                <Svg height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} width="100%">
                    <Defs>
                        <RadialGradient cx="50%" cy="50%" id="orbCore" r="50%">
                            <Stop offset="0" stopColor={colors.accentBright} stopOpacity={0.4} />
                            <Stop offset="0.4" stopColor={colors.accent} stopOpacity={0.15} />
                            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
                        </RadialGradient>
                    </Defs>
                    <Circle cx={CENTER} cy={CENTER} fill="url(#orbCore)" r={RADIUS + 6} />
                </Svg>
            </Reanimated.View>

            <Reanimated.View style={[layerStyle, backStyle]}>
                <ParticleLayer particles={back} />
            </Reanimated.View>
            <Reanimated.View style={[layerStyle, frontStyle]}>
                <ParticleLayer particles={front} />
            </Reanimated.View>
        </Reanimated.View>
    );
};

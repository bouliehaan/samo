import { useCallback, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    Easing,
    Extrapolation,
    interpolate,
    interpolateColor,
    runOnJS,
    type SharedValue,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { CheckGlyph } from '../../components/Glyphs';
import { triggerImpact } from '../../services/haptics';
import { fonts } from '../../theme/tokens';
import { Orb } from './Orb';

// The premium "you're set" seal: the breathing gold sync orb morphs into a green
// check, the word "Done" settles in, a glint sweeps across — then the whole thing
// doesn't fade, it SHIMMERS away, dissolving into a spray of gold-and-green motes
// that rise and twinkle out. When the last of it clears, onDone() carries the user
// into the app. The ~2s it plays also gives the post-sync Home re-derive time to
// land, so the app underneath is already full by the time it's revealed.

const SUCCESS = '#2ed573';
const SILVER = '#cfd8e3';

// Timeline (ms from mount).
const FORM_MS = 440; // orb → check morph
const HOLD_MS = 720; // let "Done" breathe before it leaves
const DISSIPATE_MS = 920; // the shimmer-away
const DISSIPATE_START = FORM_MS + HOLD_MS;

const CORE = 96; // diameter of the seal disc

// Deterministic mote field — an even ring with gentle per-index jitter reads more
// intentional (and more expensive-looking) than true randomness, which clumps.
const TAU = Math.PI * 2;
const MOTE_COLORS = [SUCCESS, SILVER, '#eef2f7', '#7bed9f', '#ffffff'];
const MOTES = Array.from({ length: 20 }, (_, i) => {
    const ring = i % 3;
    return {
        angle: (i / 20) * TAU + (i % 3) * 0.13,
        color: MOTE_COLORS[i % MOTE_COLORS.length],
        // Staggered launch so the cloud breathes outward instead of snapping.
        delay: ((i % 5) / 5) * 0.16,
        distance: 56 + ring * 24 + (i % 2) * 12,
        lift: 12 + (i % 5) * 7, // upward bias — it rises as it scatters
        size: 3 + (i % 4),
    };
});

const Mote = ({
    angle,
    color,
    delay,
    dissipate,
    distance,
    lift,
    size,
}: {
    angle: number;
    color: string;
    delay: number;
    dissipate: SharedValue<number>;
    distance: number;
    lift: number;
    size: number;
}) => {
    const style = useAnimatedStyle(() => {
        const p = interpolate(dissipate.value, [delay, 1], [0, 1], Extrapolation.CLAMP);
        return {
            opacity: interpolate(p, [0, 0.12, 0.62, 1], [0, 1, 0.85, 0], Extrapolation.CLAMP),
            transform: [
                { translateX: Math.cos(angle) * distance * p },
                { translateY: Math.sin(angle) * distance * p - lift * p },
                { scale: interpolate(p, [0, 0.35, 1], [0.2, 1.18, 0], Extrapolation.CLAMP) },
            ],
        };
    });

    return (
        <Reanimated.View
            pointerEvents="none"
            style={[
                {
                    backgroundColor: color,
                    borderRadius: size / 2,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    position: 'absolute',
                    width: size,
                },
                style,
            ]}
        />
    );
};

export const SuccessSeal = ({
    label = 'Done',
    onDone,
}: {
    label?: string;
    onDone: () => void;
}) => {
    const reduced = useReducedMotion();
    const form = useSharedValue(0); // 0 = gold orb, 1 = green check
    const pop = useSharedValue(0.86); // entrance overshoot scale
    const shimmer = useSharedValue(0); // the light glint sweep
    const dissipate = useSharedValue(0); // 0 = sealed, 1 = scattered

    // Keep onDone fresh without restarting the timeline.
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    const finish = useCallback(() => onDoneRef.current(), []);

    useEffect(() => {
        if (reduced) {
            // Honour reduce-motion: snap to the resolved check, hold briefly, leave.
            form.value = 1;
            pop.value = 1;
            triggerImpact('medium');
            const timer = setTimeout(finish, FORM_MS + HOLD_MS);
            return () => clearTimeout(timer);
        }

        form.value = withTiming(1, { duration: FORM_MS, easing: Easing.out(Easing.cubic) });
        pop.value = withSequence(
            withTiming(1.08, { duration: 300, easing: Easing.out(Easing.back(2)) }),
            withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
        );
        shimmer.value = withDelay(
            FORM_MS - 60,
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        );
        dissipate.value = withDelay(
            DISSIPATE_START,
            withTiming(
                1,
                { duration: DISSIPATE_MS, easing: Easing.inOut(Easing.cubic) },
                (done) => {
                    if (done) {
                        runOnJS(finish)();
                    }
                },
            ),
        );
        // A solid thunk the instant the check lands.
        const hapticTimer = setTimeout(() => triggerImpact('medium'), 180);
        return () => clearTimeout(hapticTimer);
    }, [dissipate, finish, form, pop, reduced, shimmer]);

    // Soft bloom of light that puffs out as the seal lets go.
    const bloomStyle = useAnimatedStyle(() => ({
        opacity: interpolate(dissipate.value, [0, 0.1, 0.5], [0, 0.45, 0], Extrapolation.CLAMP),
        transform: [
            { scale: interpolate(dissipate.value, [0, 0.5], [0.6, 1.9], Extrapolation.CLAMP) },
        ],
    }));

    const coreStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            form.value,
            [0, 1],
            ['rgba(212,192,138,0.13)', 'rgba(46,213,115,0.16)'],
        ),
        borderColor: interpolateColor(
            form.value,
            [0, 1],
            ['rgba(212,192,138,0.40)', 'rgba(46,213,115,0.55)'],
        ),
        // Quick vanish (gone by ~0.34) so the motes — not a slow crossfade — are
        // what reads. The orb dissolves INTO the shimmer.
        opacity: interpolate(dissipate.value, [0, 0.18, 0.34], [1, 1, 0], Extrapolation.CLAMP),
        transform: [
            {
                scale:
                    pop.value *
                    interpolate(dissipate.value, [0, 0.34], [1, 1.3], Extrapolation.CLAMP),
            },
        ],
    }));

    // The gold orb core collapsing as the check takes its place.
    const discStyle = useAnimatedStyle(() => ({
        opacity: interpolate(form.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
        transform: [{ scale: interpolate(form.value, [0, 0.7], [1, 0], Extrapolation.CLAMP) }],
    }));

    const checkStyle = useAnimatedStyle(() => ({
        opacity: interpolate(form.value, [0.3, 0.55], [0, 1], Extrapolation.CLAMP),
        transform: [
            { scale: interpolate(form.value, [0.25, 0.7, 1], [0, 1.15, 1], Extrapolation.CLAMP) },
        ],
    }));

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
        transform: [
            { translateX: interpolate(shimmer.value, [0, 1], [-CORE, CORE], Extrapolation.CLAMP) },
            { rotate: '22deg' },
        ],
    }));

    const labelStyle = useAnimatedStyle(() => ({
        opacity:
            interpolate(form.value, [0.45, 0.85], [0, 1], Extrapolation.CLAMP) *
            interpolate(dissipate.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
        transform: [
            {
                translateY:
                    interpolate(form.value, [0.45, 0.85], [8, 0], Extrapolation.CLAMP) +
                    interpolate(dissipate.value, [0, 0.6], [0, -16], Extrapolation.CLAMP),
            },
        ],
    }));

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', height: CORE, justifyContent: 'center', width: CORE }}>
                {/* Bloom + mote anchor sit at the exact centre of the seal box. */}
                <Reanimated.View
                    pointerEvents="none"
                    style={[
                        {
                            backgroundColor: 'rgba(46,213,115,0.25)',
                            borderRadius: CORE / 2,
                            height: CORE,
                            position: 'absolute',
                            width: CORE,
                        },
                        bloomStyle,
                    ]}
                />
                <Reanimated.View
                    style={[
                        {
                            alignItems: 'center',
                            borderRadius: CORE / 2,
                            borderWidth: 1,
                            height: CORE,
                            justifyContent: 'center',
                            overflow: 'hidden',
                            width: CORE,
                        },
                        coreStyle,
                    ]}
                >
                    {/* Glint of light sweeping across the seal. */}
                    <Reanimated.View
                        pointerEvents="none"
                        style={[
                            { height: CORE * 1.8, position: 'absolute', width: 26 },
                            shimmerStyle,
                        ]}
                    >
                        <LinearGradient
                            colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
                            end={{ x: 1, y: 0 }}
                            start={{ x: 0, y: 0 }}
                            style={{ flex: 1 }}
                        />
                    </Reanimated.View>

                    <Reanimated.View style={checkStyle}>
                        <CheckGlyph color={SUCCESS} size={46} />
                    </Reanimated.View>
                </Reanimated.View>

                {/* The real particle orb sits OVER the core (outside its clip) and
                    gathers inward as the check takes its place — so the orb itself
                    forms into the seal. */}
                <Reanimated.View
                    pointerEvents="none"
                    style={[
                        {
                            alignItems: 'center',
                            bottom: 0,
                            justifyContent: 'center',
                            left: 0,
                            position: 'absolute',
                            right: 0,
                            top: 0,
                        },
                        discStyle,
                    ]}
                >
                    <Orb active={false} size={140} />
                </Reanimated.View>

                {/* Motes on top so the burst reads clearly over the dissolving
                    core. They're invisible (opacity 0) until dissipation begins. */}
                <View pointerEvents="none" style={{ left: '50%', position: 'absolute', top: '50%' }}>
                    {MOTES.map((mote, index) => (
                        <Mote dissipate={dissipate} key={index} {...mote} />
                    ))}
                </View>
            </View>

            <Reanimated.Text
                style={[
                    {
                        color: '#f6f6f8',
                        fontFamily: fonts.heading,
                        fontSize: 26,
                        letterSpacing: -0.3,
                        marginTop: 26,
                    },
                    labelStyle,
                ]}
            >
                {label}
            </Reanimated.Text>
        </View>
    );
};

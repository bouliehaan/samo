import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    type AccessibilityActionEvent,
    type LayoutChangeEvent,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { SpeakerGlyph } from './Glyphs';
import { timings } from '../theme/motion';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

const THUMB_SIZE = 12;
/** Horizontal travel before the pan claims the touch from the page's scroll. */
const PAN_ACTIVATION_PX = 6;
/** Vertical travel that hands the touch back to the page, so the tab still scrolls. */
const PAN_VERTICAL_FAIL_PX = 14;
const TAP_MAX_DURATION_MS = 1000;
const TAP_MAX_DISTANCE_PX = 16;
/** The visible track is 4px tall — far too thin to hit without help. */
const TRACK_HIT_SLOP = { bottom: 14, top: 14 } as const;
/**
 * How close a reported level has to be to the one we sent for the device to
 * count as having caught up. Levels round-trip as floats, so this is a
 * tolerance rather than an equality check.
 */
const SETTLE_TOLERANCE = 0.005;
/**
 * Release the hold even if the device never reports the level back — a command
 * that failed must not leave the slider frozen at a level nothing is playing at.
 */
const SETTLE_FALLBACK_MS = 5000;
/** What one TalkBack increment moves the level by — a drag has no equivalent. */
const ACCESSIBILITY_STEP = 0.05;
const ACCESSIBILITY_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

const clamp01Worklet = (value: number) => {
    'worklet';
    return value < 0 ? 0 : value > 1 ? 1 : value;
};

/**
 * The percentage beside the track, in its own component so the drag never
 * re-renders the panel.
 *
 * The number has to follow the finger — a readout that sits at the old level
 * until release reads as a stuck control — but it is TEXT, so unlike the fill
 * it cannot be driven straight from the shared value. The compromise is to
 * cross to JS only when the rounded percent actually changes: at most a hundred
 * single-`Text` renders across a full-width drag, none of which touch the card
 * around it.
 */
const VolumeReadout = memo(({ progress }: { progress: SharedValue<number> }) => {
    const [percent, setPercent] = useState(() => Math.round(progress.value * 100));
    // A named JS function, never an inline lambda: runOnJS of anything that is
    // not a plain named function crashes in libworklets.
    const applyPercent = useCallback((next: number) => setPercent(next), []);

    useAnimatedReaction(
        () => Math.round(progress.value * 100),
        (next, previous) => {
            if (next !== previous) {
                runOnJS(applyPercent)(next);
            }
        },
    );

    return (
        <Text allowFontScaling={false} style={styles.samoRadioVolumeValue}>
            {percent}%
        </Text>
    );
});
VolumeReadout.displayName = 'VolumeReadout';

/**
 * Output level for one samo-radio device: drag the track, commit on release.
 *
 * It replaced a pair of ±5% buttons, which took thirteen taps — and thirteen
 * round trips to the stereo — to go from full to a third. One drag is one
 * command, and the fill follows the finger on the UI thread, so the level moves
 * even while the panel is waiting on the network.
 */
export const SamoRadioVolumeSlider = memo(
    ({ onCommit, volume }: { onCommit: (volume: number) => void; volume: number }) => {
        const [trackWidth, setTrackWidth] = useState(0);
        const progress = useSharedValue(clamp01(volume));

        // The panel re-polls every few seconds, and each poll carries the level
        // the device had BEFORE the drag. Without a hold, letting go of the
        // thumb would snap the fill back to the old level for a tick and then
        // jump to the new one. The hold spans the whole gesture and stays up
        // until the device reports the level we sent (or the fallback fires).
        const isHeldRef = useRef(false);
        const committedRef = useRef<null | number>(null);
        const fallbackTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
        // The level the device last reported, readable from a timer that must
        // not re-arm itself every time a poll lands.
        const latestVolumeRef = useRef(volume);
        latestVolumeRef.current = volume;

        const releaseHold = useCallback(() => {
            isHeldRef.current = false;
            committedRef.current = null;
            if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
            }
        }, []);

        // The command never landed — the device is still where it was, so the
        // fill has to admit it rather than sit at a level nothing is playing at.
        // Eased rather than cut, rather than looking like a dropped frame.
        const abandonHold = useCallback(() => {
            releaseHold();
            progress.value = withTiming(clamp01(latestVolumeRef.current), timings.state);
        }, [progress, releaseHold]);

        useEffect(() => () => releaseHold(), [releaseHold]);

        useEffect(() => {
            const next = clamp01(volume);
            if (isHeldRef.current) {
                if (
                    committedRef.current !== null &&
                    Math.abs(next - committedRef.current) <= SETTLE_TOLERANCE
                ) {
                    // The device is where we put it — follow polls again.
                    releaseHold();
                }
                return;
            }
            // Eased, because a poll is also how this panel learns that someone
            // turned the stereo down from another room — the fill should travel
            // there rather than teleport.
            progress.value = withTiming(next, timings.state);
        }, [progress, releaseHold, volume]);

        const beginInteraction = useCallback(() => {
            isHeldRef.current = true;
            committedRef.current = null;
        }, []);

        const cancelInteraction = useCallback(() => {
            if (committedRef.current === null) {
                abandonHold();
            }
        }, [abandonHold]);

        const commitVolume = useCallback(
            (next: number) => {
                isHeldRef.current = true;
                committedRef.current = next;
                if (fallbackTimerRef.current) {
                    clearTimeout(fallbackTimerRef.current);
                }
                fallbackTimerRef.current = setTimeout(abandonHold, SETTLE_FALLBACK_MS);
                onCommit(next);
            },
            [abandonHold, onCommit],
        );

        // A drag is not available to a screen reader, so the role exposes the
        // level as an adjustable value and TalkBack's up/down swipes step it —
        // the same 5% the buttons this replaced used to move.
        const adjustLevel = useCallback(
            (delta: number) => {
                const base = committedRef.current ?? clamp01(volume);
                const next = clamp01(Number((base + delta).toFixed(2)));
                progress.value = next;
                commitVolume(next);
            },
            [commitVolume, progress, volume],
        );

        const handleAccessibilityAction = useCallback(
            (event: AccessibilityActionEvent) => {
                if (event.nativeEvent.actionName === 'increment') {
                    adjustLevel(ACCESSIBILITY_STEP);
                    return;
                }
                if (event.nativeEvent.actionName === 'decrement') {
                    adjustLevel(-ACCESSIBILITY_STEP);
                }
            },
            [adjustLevel],
        );

        const gesture = useMemo(() => {
            const enabled = trackWidth > 0;

            const tap = Gesture.Tap()
                .enabled(enabled)
                .hitSlop(TRACK_HIT_SLOP)
                .maxDistance(TAP_MAX_DISTANCE_PX)
                .maxDuration(TAP_MAX_DURATION_MS)
                .onEnd((event) => {
                    'worklet';
                    const next = clamp01Worklet(event.x / trackWidth);
                    progress.value = next;
                    runOnJS(commitVolume)(next);
                });

            const pan = Gesture.Pan()
                .enabled(enabled)
                .hitSlop(TRACK_HIT_SLOP)
                // Claim horizontal travel only. The panel sits in the Radio
                // tab's ScrollView, so a vertical drag that started on the
                // track has to remain a scroll.
                .activeOffsetX([-PAN_ACTIVATION_PX, PAN_ACTIVATION_PX])
                .failOffsetY([-PAN_VERTICAL_FAIL_PX, PAN_VERTICAL_FAIL_PX])
                .onStart((event) => {
                    'worklet';
                    runOnJS(beginInteraction)();
                    progress.value = clamp01Worklet(event.x / trackWidth);
                })
                .onUpdate((event) => {
                    'worklet';
                    progress.value = clamp01Worklet(event.x / trackWidth);
                })
                .onEnd((event) => {
                    'worklet';
                    const next = clamp01Worklet(event.x / trackWidth);
                    progress.value = next;
                    runOnJS(commitVolume)(next);
                })
                .onFinalize((_event, success) => {
                    'worklet';
                    if (!success) {
                        runOnJS(cancelInteraction)();
                    }
                });

            // Race, not Simultaneous: a touch is either a tap-to-set or a drag,
            // and both end by committing a level.
            return Gesture.Race(tap, pan);
        }, [beginInteraction, cancelInteraction, commitVolume, progress, trackWidth]);

        // Both a transform, never `width`/`left`: layout props would re-run Yoga
        // on every frame of the drag, a transform never leaves the compositor.
        const fillStyle = useAnimatedStyle(() => ({
            transform: [{ scaleX: progress.value }],
        }));
        const thumbStyle = useAnimatedStyle(
            () => ({
                transform: [{ translateX: progress.value * trackWidth - THUMB_SIZE / 2 }],
            }),
            [trackWidth],
        );

        return (
            <View style={styles.samoRadioVolumeRow}>
                <SpeakerGlyph color={colors.muted} size={16} />
                <GestureDetector gesture={gesture}>
                    <View
                        accessibilityActions={ACCESSIBILITY_ACTIONS}
                        accessibilityLabel="Volume"
                        accessibilityRole="adjustable"
                        accessibilityValue={{
                            max: 100,
                            min: 0,
                            now: Math.round(clamp01(volume) * 100),
                        }}
                        accessible
                        onAccessibilityAction={handleAccessibilityAction}
                        onLayout={(event: LayoutChangeEvent) =>
                            setTrackWidth(event.nativeEvent.layout.width)
                        }
                        style={styles.samoRadioVolumeTrackWrap}
                    >
                        <View style={styles.samoRadioVolumeTrack}>
                            <Reanimated.View
                                style={[styles.samoRadioVolumeFill, fillStyle]}
                            />
                        </View>
                        <Reanimated.View
                            pointerEvents="none"
                            style={[styles.samoRadioVolumeThumb, thumbStyle]}
                        />
                    </View>
                </GestureDetector>
                <VolumeReadout progress={progress} />
            </View>
        );
    },
);
SamoRadioVolumeSlider.displayName = 'SamoRadioVolumeSlider';

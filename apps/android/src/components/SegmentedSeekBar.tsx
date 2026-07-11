import { type MobilePlaybackSegment } from '@samo/core/mobile';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    type LayoutChangeEvent,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    runOnJS,
    type SharedValue,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
} from 'react-native-reanimated';

import { SCREEN_WIDTH } from '../theme/layout';
import { styles } from '../theme/styles';
import { spacing } from '../theme/tokens';
import { clamp } from '../utils/math';
import { logSeekGesture, SEEK_GESTURE_DEBUG } from '../utils/seek-debug';
import {
    getSeekSegmentGapWidth,
    getSeekSegments,
    getVisibleSeekSegments,
} from '../utils/playback-time';

const SEEK_THUMB_WIDTH = 5;
// Once the engine's reported position lands within this of the committed seek,
// drop the local override and follow live playback again (the native poll is
// coarse — up to ~1s — so the tolerance has to absorb a whole poll step).
const SEEK_SETTLE_TOLERANCE_MS = 2500;
// Safety net in case a seek never reports back (e.g. it failed) — release the
// override so the bar can never get permanently stuck on a dragged position.
const SEEK_SETTLE_FALLBACK_MS = 5000;
// Horizontal travel before the pan claims the gesture. Mirrors the previous
// PanResponder threshold so vertical-dismiss handoff to the player surface is
// unchanged.
const SEEK_PAN_ACTIVATION_PX = 6;
// If the finger moves this much vertically before the pan activates, the pan
// fails outright so the player's drag-to-dismiss takes over cleanly.
const SEEK_PAN_VERTICAL_FAIL_PX = 12;
// How long a touch may rest on the bar and still count as a tap-to-seek. The
// PanResponder this bar replaced committed a seek on release with NO time
// limit; the RNGH migration set this to 300ms, which silently dropped any
// deliberate (slower) tap on the thin bar — release after 300ms did nothing
// because the pan also hadn't moved the 6px needed to activate. A generous
// window restores "touch the bar anywhere to seek there".
const SEEK_TAP_MAX_DURATION_MS = 1000;
// A tap may drift up to this far and still register (a Race with the pan means
// anything past SEEK_PAN_ACTIVATION_PX becomes a drag anyway; this only keeps a
// sub-threshold wobble from being rejected as "moved too much").
const SEEK_TAP_MAX_DISTANCE_PX = 16;
// The visible track is only ~14px tall — too thin to hit reliably. Expand the
// gesture's touch area vertically so a near-miss above/below still lands.
const SEEK_HIT_SLOP = { top: 12, bottom: 12 } as const;
// `-1` is the "not scrubbing" sentinel for the dragProgress shared value —
// any value in [0, 1] means the user is dragging and the thumb should follow
// the finger instead of the live playhead.
const DRAG_IDLE = -1;

interface SegmentedSeekBarProps {
    durationMs?: number;
    // The player shell's own gestures (vertical drag-to-dismiss + horizontal
    // swipe-to-skip) that wrap this bar. Passed in so the seek tap/pan can
    // declare `blocksExternalGesture` against them: this bar lives in a nested
    // GestureDetector, and without an explicit relation the parent pans and the
    // seek pan compete with no rule for who wins — which is why a drag on the
    // bar only "took" some of the time after the PanResponder→RNGH migration.
    // With the relation, a touch that lands on the bar gives the seek gesture
    // first claim; the parent pans only take over once the seek gestures fail
    // (e.g. a clearly-vertical drag crossing failOffsetY).
    externalGestures?: ReturnType<typeof Gesture.Pan>[];
    isLive: boolean;
    isPlaying: boolean;
    onSeek: (positionMs: number) => void;
    positionMs?: number;
    segments?: MobilePlaybackSegment[];
    // Changes when the active playback session/track changes. The bar resets
    // its local state (drag override, interpolation baseline, pending seek) so
    // a leftover sample from the OUTGOING track can never resurrect itself as
    // the displayed position after Next/Prev. Without this guard the bar can
    // flash 0 then snap back to the previous track's timestamp.
    sessionKey?: string;
    tint: string;
}

const SeekSegmentFill = memo(({
    displayPositionMsSv,
    segmentDurationMs,
    segmentStartMs,
    tint,
}: {
    displayPositionMsSv: SharedValue<number>;
    segmentDurationMs: number;
    segmentStartMs: number;
    tint: string;
}) => {
    const animatedStyle = useAnimatedStyle(() => {
        if (segmentDurationMs <= 0) {
            return { width: '0%' as const };
        }
        const progress =
            (displayPositionMsSv.value - segmentStartMs) / segmentDurationMs;
        const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
        return { width: `${clamped * 100}%` as const };
    }, [segmentDurationMs, segmentStartMs]);

    return (
        <Reanimated.View
            style={[
                styles.seekSegmentFill,
                { backgroundColor: tint },
                animatedStyle,
            ]}
        />
    );
});
SeekSegmentFill.displayName = 'SeekSegmentFill';

export const SegmentedSeekBar = memo(({
    durationMs,
    externalGestures,
    isLive,
    isPlaying,
    onSeek,
    positionMs,
    segments,
    sessionKey,
    tint,
}: SegmentedSeekBarProps) => {
    const [trackWidth, setTrackWidth] = useState(0);

    // Drag override and interpolation baseline live on the UI thread so the
    // thumb tracks the finger and ticks between native samples at 60fps even
    // when the JS thread is busy (track change, background→foreground, large
    // list renders). The previous implementation drove these on the JS thread
    // via setState + requestAnimationFrame, which stuttered or froze whenever
    // JS stalled — the symptom Jacob reported as "seek bar might stop working
    // after a few uses".
    const dragProgress = useSharedValue(DRAG_IDLE);
    const baselineMs = useSharedValue(positionMs ?? 0);
    const baselineCapturedAt = useSharedValue(Date.now());
    // True only between Pan activation (onStart) and finalize. Pan's
    // onFinalize(failed) must NOT reset dragProgress for a CLEAN tap — Pan
    // never activated for a tap, never touched dragProgress, and the Tap's
    // own onEnd has already set dragProgress to the tap target. Resetting it
    // here would clobber the tap commit for one frame and produce the visible
    // tap→live→target flicker.
    const panActivated = useSharedValue(false);

    // The committed-but-not-yet-settled seek target (JS thread). Held until the
    // engine reports back near this value, or the fallback timer fires.
    const pendingSeekMsRef = useRef<number | null>(null);
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Latest positionMs read by the session-reset effect without making
    // positionMs a dep (which would re-fire the reset on every poll tick and
    // cancel an in-progress scrub).
    const latestPositionMsRef = useRef(positionMs);
    latestPositionMsRef.current = positionMs;

    const isSeekable = !isLive && Boolean(durationMs && durationMs > 0 && trackWidth > 0);

    const clearPendingSeek = useCallback(() => {
        pendingSeekMsRef.current = null;
        if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
        dragProgress.value = DRAG_IDLE;
    }, [dragProgress]);

    // Track-change reset: the OUTGOING track's last position must not bleed
    // into the new track's bar. Clearing drag + baseline atomically here means
    // the very first paint of the new session shows the freshly-arrived
    // positionMs (0 for music, resume for long-form) and never the stale value.
    // Reads the latest positionMs via a ref so this effect only fires on
    // session change — making positionMs a real dep would cancel any in-flight
    // scrub on every native poll tick.
    useEffect(() => {
        dragProgress.value = DRAG_IDLE;
        baselineMs.value = latestPositionMsRef.current ?? 0;
        baselineCapturedAt.value = Date.now();
        pendingSeekMsRef.current = null;
        if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
    }, [baselineCapturedAt, baselineMs, dragProgress, sessionKey]);

    // Re-baseline whenever a new native sample arrives. Done in an effect
    // (not in the render body, which was the previous anti-pattern — ref
    // mutation during render is unsafe under React's concurrent rules and
    // also caused the baseline to thrash if positionMs oscillated mid-render).
    useEffect(() => {
        baselineMs.value = positionMs ?? 0;
        baselineCapturedAt.value = Date.now();
        // Release the drag override once live playback catches up to the
        // committed seek.
        if (
            pendingSeekMsRef.current !== null &&
            Math.abs((positionMs ?? 0) - pendingSeekMsRef.current) <= SEEK_SETTLE_TOLERANCE_MS
        ) {
            clearPendingSeek();
        }
    }, [baselineCapturedAt, baselineMs, clearPendingSeek, positionMs]);

    useEffect(
        () => () => {
            if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
            }
        },
        [],
    );

    const commitSeek = useCallback(
        (progress: number) => {
            if (!durationMs) {
                clearPendingSeek();
                return;
            }
            const targetMs = clamp(progress * durationMs, 0, durationMs);
            // Hold the thumb at the dragged position by leaving dragProgress
            // set; only release once the engine reports back (the settle check
            // above) or the fallback timer expires.
            pendingSeekMsRef.current = targetMs;
            dragProgress.value = progress;
            onSeek(targetMs);
            if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
            }
            fallbackTimerRef.current = setTimeout(clearPendingSeek, SEEK_SETTLE_FALLBACK_MS);
        },
        [clearPendingSeek, dragProgress, durationMs, onSeek],
    );

    // Tap commits immediately on release. Locks dragProgress on the UI thread
    // INSIDE the worklet (before runOnJS) so the bar paints the tapped position
    // synchronously — the Pan in the race below resolves to failed for a clean
    // tap, and if dragProgress hadn't been claimed here the loser's onFinalize
    // would briefly reset it to DRAG_IDLE for one frame before the JS-thread
    // commitSeek roundtrip lands, producing the visible tap → live → target
    // flicker.
    const tapGesture = useMemo(
        () => {
            const tap = Gesture.Tap()
                .maxDuration(SEEK_TAP_MAX_DURATION_MS)
                .maxDistance(SEEK_TAP_MAX_DISTANCE_PX)
                .hitSlop(SEEK_HIT_SLOP)
                .onBegin(() => {
                    'worklet';
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('tap:begin', { trackWidth });
                    }
                })
                .onEnd((event, success) => {
                    'worklet';
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('tap:end', {
                            success,
                            x: event.x,
                            trackWidth,
                        });
                    }
                    if (!success) return;
                    if (trackWidth <= 0) return;
                    const progress = clampWorklet(event.x / trackWidth);
                    dragProgress.value = progress;
                    runOnJS(commitSeek)(progress);
                })
                .onFinalize((_event, success) => {
                    'worklet';
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('tap:finalize', { success });
                    }
                });
            return externalGestures && externalGestures.length > 0
                ? tap.blocksExternalGesture(...externalGestures)
                : tap;
        },
        [commitSeek, dragProgress, externalGestures, trackWidth],
    );

    // Pan tracks the finger on the UI thread. activeOffsetX claims only after
    // 6px of horizontal travel; failOffsetY hands vertical drags up to the
    // player surface so dismiss-by-drag still works while scrubbing on the bar.
    // onStart (post-activation) — NOT onBegin (touch-down) — owns the initial
    // dragProgress write. A clean tap never activates the pan, so dragProgress
    // is never touched here for taps; if it were (the old onBegin behavior),
    // the pan losing the race would call onFinalize(success=false) which clears
    // dragProgress, fighting the tap's own commit and causing visible flicker.
    const panGesture = useMemo(
        () => {
            const pan = Gesture.Pan()
                .activeOffsetX([-SEEK_PAN_ACTIVATION_PX, SEEK_PAN_ACTIVATION_PX])
                .failOffsetY([-SEEK_PAN_VERTICAL_FAIL_PX, SEEK_PAN_VERTICAL_FAIL_PX])
                .hitSlop(SEEK_HIT_SLOP)
                .onBegin(() => {
                    'worklet';
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('pan:begin', { trackWidth });
                    }
                })
                .onStart((event) => {
                    'worklet';
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('pan:activate', {
                            x: event.x,
                            trackWidth,
                        });
                    }
                    if (trackWidth <= 0) return;
                    panActivated.value = true;
                    dragProgress.value = clampWorklet(event.x / trackWidth);
                })
                .onUpdate((event) => {
                    'worklet';
                    if (trackWidth <= 0) return;
                    dragProgress.value = clampWorklet(event.x / trackWidth);
                })
                .onEnd((event) => {
                    'worklet';
                    if (trackWidth <= 0) {
                        dragProgress.value = DRAG_IDLE;
                        return;
                    }
                    const progress = clampWorklet(event.x / trackWidth);
                    dragProgress.value = progress;
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('pan:end', { progress });
                    }
                    runOnJS(commitSeek)(progress);
                })
                .onFinalize((_event, success) => {
                    'worklet';
                    // Only reset dragProgress when Pan actually took control.
                    // A clean tap fails Pan WITHOUT ever activating — Pan never
                    // touched dragProgress, so resetting here would race the
                    // Tap's onEnd and cause one-frame flicker. When Pan was
                    // active and got cancelled mid-drag, the user's drag was
                    // interrupted with no committed seek — snap back to live.
                    const wasActive = panActivated.value;
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('pan:finalize', { success, wasActive });
                    }
                    panActivated.value = false;
                    if (!success && wasActive) {
                        dragProgress.value = DRAG_IDLE;
                    }
                });
            return externalGestures && externalGestures.length > 0
                ? pan.blocksExternalGesture(...externalGestures)
                : pan;
        },
        [commitSeek, dragProgress, externalGestures, panActivated, trackWidth],
    );

    // Race so Tap fires for a clean tap, Pan takes over for a drag past the
    // 6px threshold. Either way the bar always reacts to a touch.
    const gesture = useMemo(
        () =>
            isSeekable
                ? Gesture.Race(tapGesture, panGesture)
                : Gesture.Tap().enabled(false),
        [isSeekable, panGesture, tapGesture],
    );

    const seekTrackWidth = trackWidth > 0 ? trackWidth : Math.max(1, SCREEN_WIDTH - spacing.lg * 2);
    const seekSegments = useMemo(
        () => getSeekSegments(segments, durationMs),
        [durationMs, segments],
    );
    const visibleSeekSegments = useMemo(
        () => getVisibleSeekSegments(seekSegments, seekTrackWidth),
        [seekSegments, seekTrackWidth],
    );
    const seekSegmentGapWidth = getSeekSegmentGapWidth(
        visibleSeekSegments.length,
        seekTrackWidth,
    );

    // The single derived position that drives every fill and the thumb. Runs
    // on the UI thread on every frame; no JS-thread polling, no setState,
    // no requestAnimationFrame churn.
    const displayPositionMsSv = useDerivedValue(() => {
        if (dragProgress.value >= 0 && durationMs) {
            return dragProgress.value * durationMs;
        }
        const base = baselineMs.value;
        if (!isPlaying || isLive) {
            return base;
        }
        const elapsed = Date.now() - baselineCapturedAt.value;
        const interpolated = base + elapsed;
        if (durationMs && durationMs > 0 && interpolated > durationMs) {
            return durationMs;
        }
        return interpolated;
    }, [durationMs, isLive, isPlaying]);

    const thumbAnimatedStyle = useAnimatedStyle(() => {
        if (isLive || !durationMs || durationMs <= 0 || trackWidth <= 0) {
            return { left: -SEEK_THUMB_WIDTH, opacity: 0 };
        }
        const progress = displayPositionMsSv.value / durationMs;
        const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
        return {
            left: clamped * trackWidth - SEEK_THUMB_WIDTH / 2,
            opacity: 1,
        };
    }, [durationMs, isLive, trackWidth]);

    return (
        <GestureDetector gesture={gesture}>
            <View
                onLayout={(event: LayoutChangeEvent) =>
                    setTrackWidth(event.nativeEvent.layout.width)
                }
                style={styles.segmentedSeekTrack}
            >
                {isLive ? (
                    <View style={[styles.seekSegment, styles.seekSegmentLive]}>
                        <View
                            style={[styles.seekSegmentLiveFill, { backgroundColor: tint }]}
                        />
                    </View>
                ) : (
                    visibleSeekSegments.map((segment, index) => {
                        const segmentDurationMs = (segment.durationSeconds ?? 0) * 1000;
                        return (
                            <View
                                key={`${segment.id}-${index}`}
                                style={[
                                    styles.seekSegment,
                                    {
                                        flexGrow: segment.durationSeconds ?? 1,
                                        marginRight:
                                            index === visibleSeekSegments.length - 1
                                                ? 0
                                                : seekSegmentGapWidth,
                                    },
                                ]}
                            >
                                <SeekSegmentFill
                                    displayPositionMsSv={displayPositionMsSv}
                                    segmentDurationMs={segmentDurationMs}
                                    segmentStartMs={segment.startSeconds * 1000}
                                    tint={tint}
                                />
                            </View>
                        );
                    })
                )}
                {!isLive && durationMs && trackWidth > 0 ? (
                    <Reanimated.View
                        pointerEvents="none"
                        style={[
                            styles.seekThumb,
                            { backgroundColor: tint },
                            thumbAnimatedStyle,
                        ]}
                    />
                ) : null}
            </View>
        </GestureDetector>
    );
});

SegmentedSeekBar.displayName = 'SegmentedSeekBar';

function clampWorklet(value: number) {
    'worklet';
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

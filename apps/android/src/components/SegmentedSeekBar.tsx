import { type MobilePlaybackSegment } from '@samo/core/mobile';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    type LayoutChangeEvent,
    PanResponder,
    View,
} from 'react-native';

import { SCREEN_WIDTH } from '../theme/layout';
import { styles } from '../theme/styles';
import { spacing } from '../theme/tokens';
import { clamp } from '../utils/math';
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

export const SegmentedSeekBar = memo(({
    durationMs,
    isLive,
    onSeek,
    positionMs,
    segments,
    tint,
}: {
    durationMs?: number;
    isLive: boolean;
    onSeek: (positionMs: number) => void;
    positionMs?: number;
    segments?: MobilePlaybackSegment[];
    tint: string;
}) => {
    const [trackWidth, setTrackWidth] = useState(0);
    // While the user is scrubbing — and briefly after release until the engine
    // catches up — the thumb follows THIS local value instead of the (laggy,
    // poll-driven) `positionMs`, so it tracks the finger and never snaps back.
    const [dragProgress, setDragProgress] = useState<number | null>(null);
    const pendingSeekMsRef = useRef<number | null>(null);
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isSeekable = !isLive && Boolean(durationMs && durationMs > 0 && trackWidth > 0);
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

    const progressFromLocation = useCallback(
        (locationX: number) => clamp(trackWidth > 0 ? locationX / trackWidth : 0, 0, 1),
        [trackWidth],
    );

    const clearPendingSeek = useCallback(() => {
        pendingSeekMsRef.current = null;
        if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
        setDragProgress(null);
    }, []);

    const commitSeek = useCallback(
        (progress: number) => {
            if (!durationMs) {
                clearPendingSeek();
                return;
            }
            const targetMs = progress * durationMs;
            // Hold the thumb here until the engine reports it landed — committing
            // ONCE on release (not on every move) avoids hammering the player and
            // the backward "snap to the pre-seek position" flicker.
            pendingSeekMsRef.current = targetMs;
            setDragProgress(progress);
            onSeek(targetMs);
            if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
            }
            fallbackTimerRef.current = setTimeout(clearPendingSeek, SEEK_SETTLE_FALLBACK_MS);
        },
        [clearPendingSeek, durationMs, onSeek],
    );

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                // Only claim horizontal drags so vertical swipes dismiss the player.
                onMoveShouldSetPanResponder: (_event, gestureState) =>
                    isSeekable &&
                    Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
                    Math.abs(gestureState.dx) > 6,
                onPanResponderGrant: (event) => {
                    if (isSeekable) {
                        setDragProgress(progressFromLocation(event.nativeEvent.locationX));
                    }
                },
                onPanResponderMove: (event) => {
                    if (isSeekable) {
                        setDragProgress(progressFromLocation(event.nativeEvent.locationX));
                    }
                },
                onPanResponderRelease: (event) => {
                    if (isSeekable) {
                        commitSeek(progressFromLocation(event.nativeEvent.locationX));
                    } else {
                        setDragProgress(null);
                    }
                },
                onPanResponderTerminate: () => {
                    // Cancelled mid-drag with nothing committed — drop the override.
                    if (pendingSeekMsRef.current === null) {
                        setDragProgress(null);
                    }
                },
                onStartShouldSetPanResponder: () => false,
            }),
        [commitSeek, isSeekable, progressFromLocation],
    );

    // Release the override once live playback catches up to the committed seek.
    useEffect(() => {
        if (pendingSeekMsRef.current === null) {
            return;
        }
        if (Math.abs((positionMs ?? 0) - pendingSeekMsRef.current) <= SEEK_SETTLE_TOLERANCE_MS) {
            clearPendingSeek();
        }
    }, [clearPendingSeek, positionMs]);

    useEffect(
        () => () => {
            if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
            }
        },
        [],
    );

    const displayPositionMs =
        dragProgress !== null && durationMs ? dragProgress * durationMs : (positionMs ?? 0);
    const globalProgress =
        !isLive && durationMs && durationMs > 0
            ? clamp(displayPositionMs / durationMs, 0, 1)
            : null;

    return (
        <View
            {...panResponder.panHandlers}
            onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
            style={styles.segmentedSeekTrack}
        >
            {isLive ? (
                <View style={[styles.seekSegment, styles.seekSegmentLive]}>
                    <View style={[styles.seekSegmentLiveFill, { backgroundColor: tint }]} />
                </View>
            ) : (
                visibleSeekSegments.map((segment, index) => {
                    const segmentStartMs = segment.startSeconds * 1000;
                    const segmentDurationMs = (segment.durationSeconds ?? 0) * 1000;
                    const segmentProgress =
                        segmentDurationMs > 0
                            ? clamp((displayPositionMs - segmentStartMs) / segmentDurationMs, 0, 1)
                            : 0;

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
                            <View
                                style={[
                                    styles.seekSegmentFill,
                                    {
                                        backgroundColor: tint,
                                        width: `${segmentProgress * 100}%`,
                                    },
                                ]}
                            />
                        </View>
                    );
                })
            )}
            {globalProgress !== null && trackWidth > 0 ? (
                <View
                    pointerEvents="none"
                    style={[
                        styles.seekThumb,
                        {
                            backgroundColor: tint,
                            left: globalProgress * trackWidth - SEEK_THUMB_WIDTH / 2,
                        },
                    ]}
                />
            ) : null}
        </View>
    );
});

SegmentedSeekBar.displayName = 'SegmentedSeekBar';

import { type MobilePlaybackSegment } from '@samo/core/mobile';
import { memo, useCallback, useMemo, useState } from 'react';
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
    const seekFromLocation = useCallback(
        (locationX: number) => {
            if (!isSeekable || !durationMs) {
                return;
            }

            const nextProgress = clamp(locationX / trackWidth, 0, 1);

            onSeek(nextProgress * durationMs);
        },
        [durationMs, isSeekable, onSeek, trackWidth],
    );
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                // Only claim horizontal drags so vertical swipes dismiss the player.
                onMoveShouldSetPanResponder: (_event, gestureState) =>
                    isSeekable &&
                    Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
                    Math.abs(gestureState.dx) > 6,
                onPanResponderGrant: (event) => seekFromLocation(event.nativeEvent.locationX),
                onPanResponderMove: (event) => seekFromLocation(event.nativeEvent.locationX),
                onStartShouldSetPanResponder: () => false,
            }),
        [isSeekable, seekFromLocation],
    );

    const globalProgress =
        !isLive && durationMs && durationMs > 0
            ? clamp((positionMs ?? 0) / durationMs, 0, 1)
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
                            ? clamp(((positionMs ?? 0) - segmentStartMs) / segmentDurationMs, 0, 1)
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

import { type MobilePlayableAudio, type MobilePlaybackSegment } from '@samo/core/mobile';

import { type AndroidNativePlaybackEvent } from '../services/audio-playback';
import {
    type ActiveAndroidPlaybackState,
    type AndroidPlaybackState,
    type AndroidPlaybackStatus,
} from '../types/playback';

export const getActivePlaybackStatus = (
    status: AndroidNativePlaybackEvent['status'],
    fallback: AndroidPlaybackStatus,
): AndroidPlaybackStatus => {
    return status === 'idle' ? fallback : status;
};

const PLAYBACK_POSITION_BACKWARD_TOLERANCE_MS = 2500;
const PLAYBACK_POSITION_RESET_GUARD_MS = 5000;

export const getStablePlaybackPositionMs = (
    event: AndroidNativePlaybackEvent,
    current: ActiveAndroidPlaybackState,
) => {
    const eventPositionMs = event.positionMs;
    const currentPositionMs = current.positionMs;

    if (eventPositionMs === undefined || !Number.isFinite(eventPositionMs)) {
        return currentPositionMs;
    }

    if (event.status === 'idle') {
        return currentPositionMs;
    }

    if (currentPositionMs === undefined || event.status === 'ended') {
        return eventPositionMs;
    }

    if (eventPositionMs <= 100 && currentPositionMs > PLAYBACK_POSITION_RESET_GUARD_MS) {
        return currentPositionMs;
    }

    if (eventPositionMs + PLAYBACK_POSITION_BACKWARD_TOLERANCE_MS < currentPositionMs) {
        return currentPositionMs;
    }

    return eventPositionMs;
};

export const getPlaybackItemDurationMs = (item: MobilePlayableAudio) => {
    return item.durationSeconds && item.durationSeconds > 0
        ? item.durationSeconds * 1000
        : undefined;
};

export const getPlaybackEventDurationMs = (
    event: AndroidNativePlaybackEvent,
    item: MobilePlayableAudio,
) => {
    return event.durationMs && event.durationMs > 0
        ? event.durationMs
        : getPlaybackItemDurationMs(item);
};

export const getPlaybackDurationMs = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return undefined;
    }

    return playbackState.durationMs && playbackState.durationMs > 0
        ? playbackState.durationMs
        : getPlaybackItemDurationMs(playbackState.item);
};

export const getActiveTimelineSegment = (
    item: MobilePlayableAudio,
    positionMs: number | undefined,
) => {
    if (!item.timelineSegments || item.timelineSegments.length === 0) {
        return undefined;
    }

    const fallbackPositionMs =
        item.initialPositionSeconds && item.initialPositionSeconds > 0
            ? item.initialPositionSeconds * 1000
            : 0;
    const positionSeconds = (positionMs ?? fallbackPositionMs) / 1000;
    const orderedSegments = [...item.timelineSegments].sort(
        (left, right) => left.startSeconds - right.startSeconds,
    );
    let activeSegment: MobilePlaybackSegment | undefined;

    for (const segment of orderedSegments) {
        if (segment.startSeconds <= positionSeconds + 0.5) {
            activeSegment = segment;
        }
    }

    return activeSegment;
};

export const getPlaybackDisplayMetadata = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return { subtitle: undefined, title: '' };
    }

    const item = playbackState.item;
    const activeSegment = getActiveTimelineSegment(item, playbackState.positionMs);
    const useSegmentTitle = item.source === 'audiobook' && activeSegment?.title;
    const chapterSubtitle =
        item.source === 'podcast' && activeSegment?.title ? activeSegment.title : undefined;
    const fallbackSubtitle = item.source === 'radio' ? 'Radio' : getSourceLabel(item.source);

    return {
        subtitle: chapterSubtitle ?? getDisplaySubtitle(item.subtitle) ?? fallbackSubtitle,
        title: useSegmentTitle
            ? (activeSegment.title ?? item.title ?? 'Unknown title')
            : (item.title ?? 'Unknown title'),
    };
};

export const isLivePlayback = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return false;
    }

    return playbackState.item.source === 'radio' && playbackState.item.isLive !== false;
};

export const getSourceLabel = (source: MobilePlayableAudio['source']) => {
    if (source === 'audiobook') return 'Audiobook';
    if (source === 'podcast') return 'Podcast';
    if (source === 'radio') return 'Radio';

    return 'Music';
};

export const looksLikeUrl = (value: string | undefined) => {
    if (!value) {
        return false;
    }

    return /^(https?:\/\/|www\.|[a-z]+:\/\/)/i.test(value.trim());
};

export const getDisplaySubtitle = (subtitle: string | undefined) => {
    if (!subtitle || looksLikeUrl(subtitle)) {
        return undefined;
    }

    return subtitle;
};

export const formatPlaybackTime = (milliseconds: number | undefined) => {
    if (!milliseconds || milliseconds <= 0) {
        return '0:00';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}`;
    }

    return `${minutes}:${seconds}`;
};

export const getDurationLabel = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return '';
    }

    if (playbackState.item.source === 'radio') {
        return 'RADIO';
    }

    return formatPlaybackTime(getPlaybackDurationMs(playbackState));
};

export const getAdjacentSegmentTargetMs = (
    segments: MobilePlaybackSegment[] | undefined,
    positionMs: number,
    direction: -1 | 1,
) => {
    if (!segments || segments.length === 0) {
        return undefined;
    }

    const orderedSegments = [...segments].sort(
        (left, right) => left.startSeconds - right.startSeconds,
    );
    const positionSeconds = positionMs / 1000;

    if (direction === 1) {
        const nextSegment = orderedSegments.find(
            (segment) => segment.startSeconds > positionSeconds + 1,
        );

        return nextSegment ? nextSegment.startSeconds * 1000 : undefined;
    }

    let currentIndex = -1;

    for (let index = orderedSegments.length - 1; index >= 0; index -= 1) {
        const segment = orderedSegments[index];

        if (segment && segment.startSeconds <= positionSeconds) {
            currentIndex = index;
            break;
        }
    }
    const currentSegment = orderedSegments[currentIndex];

    if (currentSegment && positionSeconds - currentSegment.startSeconds > 3) {
        return currentSegment.startSeconds * 1000;
    }

    return currentIndex > 0 ? orderedSegments[currentIndex - 1].startSeconds * 1000 : undefined;
};

export const getSeekSegments = (
    segments: MobilePlaybackSegment[] | undefined,
    durationMs: number | undefined,
) => {
    const durationSeconds = durationMs ? durationMs / 1000 : 0;
    const orderedSegments = [...(segments ?? [])].sort(
        (left, right) => left.startSeconds - right.startSeconds,
    );
    const timelineSegments = orderedSegments.flatMap((segment, index) => {
        const nextStart = orderedSegments[index + 1]?.startSeconds;
        const segmentEnd =
            segment.durationSeconds !== undefined
                ? segment.startSeconds + segment.durationSeconds
                : nextStart !== undefined
                  ? nextStart
                  : durationSeconds;
        const segmentDuration = Math.max(0, segmentEnd - segment.startSeconds);

        return segmentDuration > 0 ? [{ ...segment, durationSeconds: segmentDuration }] : [];
    });

    if (timelineSegments.length > 1) {
        return timelineSegments;
    }

    return [{ durationSeconds: Math.max(1, durationSeconds), id: 'full', startSeconds: 0 }];
};

const MIN_VISUAL_SEEK_SEGMENT_WIDTH = 3.6;
const SEEK_SEGMENT_MAX_GAP_WIDTH = 4;
const SEEK_SEGMENT_GAP_BUDGET = 0.24;

export const getVisibleSeekSegments = (
    segments: MobilePlaybackSegment[],
    trackWidth: number,
): MobilePlaybackSegment[] => {
    if (segments.length <= 1 || trackWidth <= 0) {
        return segments;
    }

    const maxVisibleSegments = Math.max(1, Math.floor(trackWidth / MIN_VISUAL_SEEK_SEGMENT_WIDTH));

    if (segments.length <= maxVisibleSegments) {
        return segments;
    }

    const totalDuration = segments.reduce(
        (sum, segment) => sum + Math.max(0, segment.durationSeconds ?? 0),
        0,
    );

    if (totalDuration <= 0) {
        return segments.slice(0, maxVisibleSegments);
    }

    const visibleSegments: MobilePlaybackSegment[] = [];

    for (let groupIndex = 0; groupIndex < maxVisibleSegments; groupIndex += 1) {
        const startIndex = Math.floor((groupIndex * segments.length) / maxVisibleSegments);
        const endIndex = Math.max(
            startIndex + 1,
            groupIndex === maxVisibleSegments - 1
                ? segments.length
                : Math.floor(((groupIndex + 1) * segments.length) / maxVisibleSegments),
        );
        const group = segments.slice(startIndex, endIndex);
        const groupStart = group[0];
        const groupEnd = group[group.length - 1];
        if (!groupStart || !groupEnd) continue;
        const groupDuration = group.reduce(
            (sum, segment) => sum + Math.max(0, segment.durationSeconds ?? 0),
            0,
        );

        visibleSegments.push({
            durationSeconds: Math.max(groupDuration, 1),
            id:
                group.length === 1
                    ? groupStart.id
                    : `${groupStart.id}-${groupEnd.id}-${groupIndex}`,
            startSeconds: groupStart.startSeconds,
            title: groupStart.title,
        });
    }

    return visibleSegments;
};

export const getSeekSegmentGapWidth = (segmentCount: number, trackWidth: number) => {
    if (segmentCount <= 1 || trackWidth <= 0) {
        return 0;
    }

    return Math.min(
        SEEK_SEGMENT_MAX_GAP_WIDTH,
        (trackWidth * SEEK_SEGMENT_GAP_BUDGET) / (segmentCount - 1),
    );
};

export const findActiveChapterIndex = (
    chapters: MobilePlaybackSegment[],
    positionSeconds: number,
): number => {
    let index = -1;
    for (let i = 0; i < chapters.length; i += 1) {
        if (chapters[i].startSeconds <= positionSeconds) {
            index = i;
        } else {
            break;
        }
    }
    return index;
};

export const formatChapterRange = (chapter: MobilePlaybackSegment): string => {
    const start = formatPlaybackTime(chapter.startSeconds * 1000);
    if (chapter.durationSeconds === undefined) {
        return start;
    }
    return `${start} · ${formatPlaybackTime(chapter.durationSeconds * 1000)}`;
};

import {
    formatRadioStreamFormat,
    getRadioPlaybackMetadataLines,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
} from '@samo/core/mobile';

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

/**
 * How long after a user seek to hold the optimistic target against stale
 * engine echoes. Native events emitted before the seek reached the engine
 * still carry the old position; without this grace they would be adopted
 * as truth, after which the backward-guard would reject every real post-
 * seek sample — the bar gets permanently stuck at the pre-seek position.
 */
export const PLAYBACK_PENDING_SEEK_GRACE_MS = 1500;

/**
 * Window around the seek target that counts as "engine confirmed the
 * seek." A sample within this distance clears the grace and resumes
 * normal position handling.
 */
export const PLAYBACK_PENDING_SEEK_TARGET_TOLERANCE_MS = 2500;

/** How close to duration (ms) counts as end-of-track for queue auto-advance. */
export const PLAYBACK_NEAR_END_TOLERANCE_MS = 2500;

/** Native stop/clear often reports position at or below this after a natural end. */
export const PLAYBACK_POSITION_RESET_THRESHOLD_MS = 100;

export const isPositionNearPlaybackEnd = (
    durationMs: number | undefined,
    positionMs: number | undefined,
) => {
    if (!durationMs || durationMs <= 0 || !positionMs || positionMs <= 0) {
        return false;
    }

    return durationMs - positionMs <= PLAYBACK_NEAR_END_TOLERANCE_MS;
};

export const hasPlaybackSourceChanged = (
    event: Pick<AndroidNativePlaybackEvent, 'source'>,
    currentItemId: string,
) => {
    const eventSourceId = event.source?.id;
    if (!eventSourceId) {
        return false;
    }
    return eventSourceId !== currentItemId;
};

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

    if (hasPlaybackSourceChanged(event, current.item.id)) {
        return eventPositionMs;
    }

    if (currentPositionMs === undefined || event.status === 'ended') {
        return eventPositionMs;
    }

    const currentDurationMs =
        current.durationMs && current.durationMs > 0
            ? current.durationMs
            : getPlaybackItemDurationMs(current.item);

    if (
        eventPositionMs + PLAYBACK_POSITION_BACKWARD_TOLERANCE_MS < currentPositionMs &&
        (isPositionNearPlaybackEnd(currentDurationMs, currentPositionMs) ||
            (event.durationMs &&
                event.durationMs > 0 &&
                currentDurationMs &&
                Math.abs(event.durationMs - currentDurationMs) > 2000))
    ) {
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

/** Progress fields when applying a native status/event onto React playback state. */
export const resolvePlaybackProgressFromEvent = (
    event: AndroidNativePlaybackEvent,
    current: ActiveAndroidPlaybackState,
    activeItem: MobilePlayableAudio,
): Pick<ActiveAndroidPlaybackState, 'durationMs' | 'positionMs'> => {
    const trackChanged =
        current.item.id !== activeItem.id ||
        hasPlaybackSourceChanged(event, activeItem.id);

    if (trackChanged) {
        const positionMs = Math.max(0, event.positionMs ?? 0);
        const durationMs =
            getPlaybackItemDurationMs(activeItem) ?? getPlaybackEventDurationMs(event, activeItem);

        return { durationMs, positionMs };
    }

    return {
        durationMs: getPlaybackEventDurationMs(event, activeItem),
        positionMs: getStablePlaybackPositionMs(event, current),
    };
};

export const getPlaybackItemDurationMs = (item: MobilePlayableAudio) => {
    return item.durationSeconds && item.durationSeconds > 0
        ? item.durationSeconds * 1000
        : undefined;
};

/**
 * Length of the book-global timeline the item's playhead and chapter markers
 * live on. Falls back to the item's own stream length for anything that has no
 * wider timeline (single-file books, offline items built before the manifest
 * carried a book duration).
 */
export const getPlaybackItemTimelineDurationMs = (item: MobilePlayableAudio) => {
    return item.timelineDurationSeconds && item.timelineDurationSeconds > 0
        ? item.timelineDurationSeconds * 1000
        : getPlaybackItemDurationMs(item);
};

export const getPlaybackEventDurationMs = (
    event: AndroidNativePlaybackEvent,
    item: MobilePlayableAudio,
) => {
    const itemDurationMs = getPlaybackItemDurationMs(item);
    const eventDurationMs =
        event.durationMs && event.durationMs > 0 ? event.durationMs : undefined;

    if (hasPlaybackSourceChanged(event, item.id)) {
        return itemDurationMs ?? eventDurationMs;
    }

    const eventPositionMs = event.positionMs ?? 0;
    if (
        itemDurationMs &&
        eventDurationMs &&
        eventPositionMs < 5000 &&
        Math.abs(eventDurationMs - itemDurationMs) > 2000
    ) {
        return itemDurationMs;
    }

    return eventDurationMs ?? itemDurationMs;
};

export const getPlaybackDurationMs = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return undefined;
    }

    const item = playbackState.item;
    // An audiobook's DISPLAY position is book-absolute (getDisplayPositionMs folds
    // progressOffsetSeconds in) and so are its chapter markers, so the duration this
    // returns — which drives the bar's total, the duration label, and the seek bar's
    // tap→position mapping — must be book-absolute too, or the playhead and every
    // marker land somewhere the audio isn't.
    //
    // `timelineDurationSeconds` IS that number. `durationSeconds` is NOT: on a
    // multi-file book it's the current FILE's length, so reading it here rendered a
    // 40-hour book as a bar one file wide (~10 min) whose chapter taps all landed
    // inside the first file, drifting further off the deeper into the book you were.
    // A one-file book has them equal, which is why single-file playback looked fine.
    // Stored playbackState.durationMs is left untouched (it stays file-relative to
    // match the stored file position, so end-detection keeps working).
    if (usesTimelinePlaybackPosition(item)) {
        const timelineMs = getPlaybackItemTimelineDurationMs(item);
        if (timelineMs) {
            return timelineMs;
        }
        const offsetMs = Math.max(0, item.progressOffsetSeconds ?? 0) * 1000;
        return playbackState.durationMs && playbackState.durationMs > 0
            ? playbackState.durationMs + offsetMs
            : undefined;
    }

    return playbackState.durationMs && playbackState.durationMs > 0
        ? playbackState.durationMs
        : getPlaybackItemDurationMs(item);
};

export const getTimelinePositionSeconds = (
    item: MobilePlayableAudio,
    positionMs: number | undefined,
): number => {
    const fallbackPositionMs =
        item.initialPositionSeconds && item.initialPositionSeconds > 0
            ? item.initialPositionSeconds * 1000
            : 0;
    const filePositionSeconds = (positionMs ?? fallbackPositionMs) / 1000;

    return filePositionSeconds + (item.progressOffsetSeconds ?? 0);
};

/**
 * Wall-clock book-global playhead = file position + per-file stream offset. Only
 * multi-file audiobooks need this now. Podcasts stream WHOLE (no offset), so the
 * native position is already the real episode position — folding an offset would
 * double-count, which is what put the podcast seek bar everywhere but the
 * playhead.
 */
export const usesTimelinePlaybackPosition = (item: MobilePlayableAudio) =>
    item.source === 'audiobook';

export const getDisplayPositionMs = (
    item: MobilePlayableAudio,
    filePositionMs: number | undefined,
): number =>
    usesTimelinePlaybackPosition(item)
        ? getTimelinePositionSeconds(item, filePositionMs) * 1000
        : filePositionMs ?? 0;

export const getCurrentTimelineSegmentIndex = (
    segments: MobilePlaybackSegment[],
    positionSeconds: number,
): number => {
    if (segments.length === 0) {
        return -1;
    }

    for (let index = segments.length - 1; index >= 0; index -= 1) {
        const segment = segments[index];
        if (segment && segment.startSeconds <= positionSeconds) {
            return index;
        }
    }

    return 0;
};

export const getActiveTimelineSegment = (
    item: MobilePlayableAudio,
    positionMs: number | undefined,
) => {
    if (!item.timelineSegments || item.timelineSegments.length === 0) {
        return undefined;
    }

    const bookPositionSeconds = getTimelinePositionSeconds(item, positionMs);
    const orderedSegments = [...item.timelineSegments].sort(
        (left, right) => left.startSeconds - right.startSeconds,
    );
    const activeIndex = getCurrentTimelineSegmentIndex(orderedSegments, bookPositionSeconds);

    return orderedSegments[activeIndex];
};

export type PlaybackDisplayMetadata = {
    /** One to three lines for mini / full player (music: up to two). */
    lines: string[];
    /** Lock-screen / system UI secondary line. */
    subtitle?: string;
    /** Primary line for notifications and artwork fallback letter. */
    title: string;
};

export const formatPlaybackReleaseDate = (publishedAtMs: number | undefined) => {
    if (!publishedAtMs || !Number.isFinite(publishedAtMs) || publishedAtMs <= 0) {
        return undefined;
    }

    return new Date(publishedAtMs).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const compactLines = (lines: Array<string | undefined>) =>
    lines.map((line) => line?.trim()).filter((line): line is string => Boolean(line));

const notificationSubtitle = (lines: string[]) => {
    const tail = lines.slice(1);
    return tail.length > 0 ? tail.join(' · ') : undefined;
};

export const getPlayableDisplayMetadata = (
    item: MobilePlayableAudio,
    positionMs?: number,
): PlaybackDisplayMetadata => {
    if (item.source === 'music') {
        const title = item.title?.trim() || 'Unknown title';
        const subtitle = getDisplaySubtitle(item.subtitle);
        const lines = compactLines([title, subtitle]);

        return {
            lines,
            subtitle,
            title,
        };
    }

    if (item.source === 'audiobook') {
        const activeSegment = getActiveTimelineSegment(item, positionMs);
        const chapter = activeSegment?.title?.trim();
        const book = item.title?.trim();
        const author = getDisplaySubtitle(item.subtitle);
        const lines = compactLines([chapter, book, author]);

        return {
            lines,
            subtitle: notificationSubtitle(lines) ?? author,
            title: lines[0] ?? book ?? 'Unknown title',
        };
    }

    if (item.source === 'podcast') {
        const episode = item.title?.trim();
        const released = formatPlaybackReleaseDate(item.publishedAt);
        const lines = compactLines([episode, released]);

        return {
            lines,
            subtitle: released,
            title: episode ?? 'Unknown title',
        };
    }

    if (item.source === 'radio') {
        const lines = getRadioPlaybackMetadataLines(item);

        return {
            lines,
            subtitle: notificationSubtitle(lines),
            title: lines[0] ?? item.title ?? 'Radio',
        };
    }

    const title = item.title?.trim() || 'Unknown title';
    const subtitle = getDisplaySubtitle(item.subtitle);
    const lines = compactLines([title, subtitle]);

    return {
        lines,
        subtitle,
        title,
    };
};

export const getPlaybackDisplayMetadata = (
    playbackState: AndroidPlaybackState,
): PlaybackDisplayMetadata => {
    if (playbackState.status === 'idle') {
        return { lines: [], subtitle: undefined, title: '' };
    }

    return getPlayableDisplayMetadata(playbackState.item, playbackState.positionMs);
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
        return formatRadioStreamFormat(playbackState.item)?.toUpperCase() ?? 'LIVE';
    }

    return formatPlaybackTime(getPlaybackDurationMs(playbackState));
};

const segmentStartToFilePositionMs = (
    startSeconds: number,
    item: MobilePlayableAudio | undefined,
) => Math.max(0, (startSeconds - (item?.progressOffsetSeconds ?? 0)) * 1000);

export const getAdjacentSegmentTargetMs = (
    segments: MobilePlaybackSegment[] | undefined,
    positionMs: number,
    direction: -1 | 1,
    item?: MobilePlayableAudio,
) => {
    if (!segments || segments.length === 0) {
        return undefined;
    }

    const orderedSegments = [...segments].sort(
        (left, right) => left.startSeconds - right.startSeconds,
    );
    const positionSeconds = item
        ? getTimelinePositionSeconds(item, positionMs)
        : positionMs / 1000;

    const currentIndex = getCurrentTimelineSegmentIndex(orderedSegments, positionSeconds);

    if (direction === 1) {
        const nextIndex = currentIndex + 1;

        if (nextIndex >= orderedSegments.length) {
            return undefined;
        }

        const nextSegment = orderedSegments[nextIndex];

        return nextSegment
            ? segmentStartToFilePositionMs(nextSegment.startSeconds, item)
            : undefined;
    }

    const currentSegment = currentIndex >= 0 ? orderedSegments[currentIndex] : undefined;

    if (currentSegment && positionSeconds - currentSegment.startSeconds > 5) {
        return segmentStartToFilePositionMs(currentSegment.startSeconds, item);
    }

    const previousSegment = currentIndex > 0 ? orderedSegments[currentIndex - 1] : undefined;

    return previousSegment
        ? segmentStartToFilePositionMs(previousSegment.startSeconds, item)
        : undefined;
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
): number => getCurrentTimelineSegmentIndex(chapters, positionSeconds);

export const formatChapterRange = (chapter: MobilePlaybackSegment): string => {
    const start = formatPlaybackTime(chapter.startSeconds * 1000);
    if (chapter.durationSeconds === undefined) {
        return start;
    }
    // Show the chapter's real END time (start + length), not its raw length. The
    // length was being clock-formatted, so a 46-minute chapter beginning at 1:08
    // rendered as "1:08:19 · 46:12" — a range that appears to end before it starts.
    // start–end reads correctly no matter how deep into the book the chapter is.
    const endSeconds = chapter.startSeconds + chapter.durationSeconds;
    return `${start} – ${formatPlaybackTime(endSeconds * 1000)}`;
};

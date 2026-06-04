import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AndroidNativePlaybackEvent } from '../services/audio-playback';
import { type AndroidPlaybackState } from '../types/playback';

import { getActivePlaybackStatus, resolvePlaybackProgressFromEvent } from './playback-time';

export interface PlaybackEventSnapshot {
    item: MobilePlayableAudio;
    sessionId: string;
}

export interface ReducePlaybackOptions {
    /**
     * Keep the existing message when the event carries none (the position poll);
     * otherwise the event's message wins, including clearing it (the live event
     * subscription). Preserves the historical per-site behavior exactly.
     */
    preserveMessage?: boolean;
    /** Adopt the event's session id (live subscription). The poll never re-stamps the session. */
    updateSessionId?: boolean;
    /**
     * Skip the update when nothing but the position changed, and by less than
     * this many ms — the poll's throttle so a sub-second tick doesn't re-render.
     * 0 (the default) disables the no-op entirely (the live subscription).
     */
    minPositionDeltaMs?: number;
}

/**
 * The single, pure transition from a native playback event to the next store
 * state. Both continuous appliers — the live event subscription and the
 * position poll — funnel through this, so there is now ONE definition of "how a
 * native event becomes playback state" instead of two slightly-divergent copies
 * that drifted apart over time (message handling, session re-stamping, the poll
 * no-op threshold). Those differences are preserved explicitly via `options`, so
 * this is behavior-identical to the inline code it replaces.
 *
 * Pure: the caller passes the current snapshot rather than the reducer reaching
 * into a ref, so this can be unit-tested in isolation.
 */
export const reducePlaybackStateFromEvent = (
    current: AndroidPlaybackState,
    event: AndroidNativePlaybackEvent,
    snapshot: PlaybackEventSnapshot | null,
    options: ReducePlaybackOptions = {},
): AndroidPlaybackState => {
    if (current.status === 'idle') {
        return current;
    }

    const activeItem = snapshot?.item ?? current.item;
    const progress = resolvePlaybackProgressFromEvent(event, current, activeItem);
    const nextStatus = getActivePlaybackStatus(event.status, current.status);
    const nextDurationMs = progress.durationMs;
    const nextPositionMs = progress.positionMs;
    const nextBitPerfect = event.bitPerfect ?? current.bitPerfect;
    const nextMessage = options.preserveMessage
        ? (event.message ?? current.message)
        : event.message;
    const nextSessionId = options.updateSessionId
        ? (event.sessionId ?? snapshot?.sessionId ?? current.sessionId)
        : current.sessionId;

    const threshold = options.minPositionDeltaMs ?? 0;
    if (
        threshold > 0 &&
        nextStatus === current.status &&
        activeItem.id === current.item.id &&
        nextDurationMs === current.durationMs &&
        nextMessage === current.message &&
        nextBitPerfect === current.bitPerfect &&
        nextSessionId === current.sessionId &&
        Math.abs((nextPositionMs ?? 0) - (current.positionMs ?? 0)) < threshold
    ) {
        return current;
    }

    return {
        ...current,
        bitPerfect: nextBitPerfect,
        durationMs: nextDurationMs,
        item: activeItem,
        message: nextMessage,
        positionMs: nextPositionMs,
        sessionId: nextSessionId,
        status: nextStatus,
    };
};

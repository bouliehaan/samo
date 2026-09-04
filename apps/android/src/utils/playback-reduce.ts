import { type DeliveredAudioFormat } from '@samo/core/audio-quality';
import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AndroidNativePlaybackEvent } from '../services/audio-playback';
import { type AndroidPlaybackState } from '../types/playback';

import {
    getActivePlaybackStatus,
    PLAYBACK_PENDING_SEEK_GRACE_MS,
    PLAYBACK_PENDING_SEEK_TARGET_TOLERANCE_MS,
    resolvePlaybackProgressFromEvent,
} from './playback-time';

/**
 * Structural equality for an observed format.
 *
 * Used to keep the PREVIOUS object identity when nothing about the delivery has
 * changed. Native re-sends the format on every status emit, so comparing by
 * reference would mark the state dirty on each position tick and re-render the
 * player roughly once a second for no reason.
 */
const sameDeliveredAudioFormat = (
    left: DeliveredAudioFormat | undefined,
    right: DeliveredAudioFormat | undefined,
) =>
    left?.bitRate === right?.bitRate &&
    left?.channelCount === right?.channelCount &&
    left?.codec === right?.codec &&
    left?.sampleRate === right?.sampleRate;

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
    /**
     * Injection point for tests: the wall clock used to evaluate the pending-
     * seek grace. Defaults to Date.now().
     */
    now?: () => number;
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

    // The snapshot says WHICH item is playing. It is NOT the authority on how
    // that item currently reads, and adopting it wholesale here threw away
    // every live metadata update on the very next position tick.
    //
    // A station's now-playing is written onto `current.item` between ticks by
    // the metadata sync — polled from the server for a samo channel, read off
    // the ICY frames for an internet station. The snapshot is only re-stamped
    // when the TRACK changes, so on a live stream it stays frozen at whatever
    // was airing when the stream was opened, and this line put it back roughly
    // once a second. Visible as a channel that never stops showing the
    // programme it was tuned to, however many times the station has moved on.
    //
    // Same id means the same item, so the fresher copy wins; a different id is
    // a real track change and the snapshot is the one that knows about it.
    const activeItem =
        snapshot?.item && snapshot.item.id !== current.item.id ? snapshot.item : current.item;

    // Foreign-event guard (single-owner discipline for the reducer).
    //
    // During a Next/Prev (or queue tap) native keeps emitting trailing ticks
    // for the OUTGOING track for a beat after JS has already committed the new
    // one. The single-owner lock in `syncPlaybackFromNativeEvent` rejects those
    // echoes and protects the snapshot/item — but it does NOT gate this reducer,
    // which the event subscription + poll call unconditionally. So a trailing
    // tick for the previous song (source.id = old track, positionMs = where you
    // left it, e.g. 52s) used to reach `resolvePlaybackProgressFromEvent`, hit
    // its `hasPlaybackSourceChanged` "track changed → adopt the event position"
    // branch, and overwrite the NEW track's playhead with the OLD track's time.
    // The backward-guard then pinned it there forever (every real lower tick for
    // the new song is rejected as "backward"). Visible bug: hit Next at 0:52,
    // the bar flips to 0, the next song starts, then the bar snaps back to 0:52
    // and sticks. An event that names a DIFFERENT track than the snapshot we're
    // displaying must never mutate that item's state — drop it whole.
    //
    // This is safe for legitimate native auto-advance: in the live event path,
    // `syncPlaybackFromNativeEvent` reconciles the snapshot to the incoming
    // track BEFORE this reducer runs, so `event.source.id === activeItem.id`
    // there and the guard does not fire. The position poll never reconciles the
    // snapshot, so it correctly ignores a foreign tick rather than jumping the
    // playhead onto a track it isn't displaying — the live subscription owns
    // transitions.
    const eventSourceId = event.source?.id;
    if (eventSourceId != null && eventSourceId !== activeItem.id) {
        return current;
    }

    const progress = resolvePlaybackProgressFromEvent(event, current, activeItem);
    const nextStatus = getActivePlaybackStatus(event.status, current.status);
    const nextDurationMs = progress.durationMs;
    const nextBitPerfect = event.bitPerfect ?? current.bitPerfect;

    // Pending-seek grace: while the user's seek is still being confirmed by
    // the engine, stale pre-seek echoes carrying the OLD position must not
    // overwrite the optimistic target — that's what causes the bar to get
    // permanently stuck at the pre-seek position after a backward seek (the
    // adopted stale forward sample then trips the backward-guard against
    // every real post-seek sample). Hold the target until either a near-
    // target sample lands or the grace expires.
    const now = (options.now ?? Date.now)();
    const trackChanged = activeItem.id !== current.item.id;

    // The observed format belongs to the track that was decoded. When the track
    // changes and the incoming event has not yet observed the new stream, the
    // outgoing track's format must be dropped rather than carried forward —
    // holding it would be the same kind of stale claim this field exists to
    // replace. Native clears it on transition as well; doing it here too means
    // the reducer is correct on its own, including on the cast path, which
    // reports no decoded format at all.
    const nextDecodedFormat = event.decodedFormat
        ? sameDeliveredAudioFormat(event.decodedFormat, current.decodedFormat)
            ? current.decodedFormat
            : event.decodedFormat
        : trackChanged
          ? undefined
          : current.decodedFormat;
    let nextPositionMs = progress.positionMs;
    let nextPendingSeekTargetMs = current.pendingSeekTargetMs;
    let nextPendingSeekAtMs = current.pendingSeekAtMs;
    if (
        current.pendingSeekTargetMs !== undefined &&
        current.pendingSeekAtMs !== undefined &&
        !trackChanged &&
        event.status !== 'ended'
    ) {
        const elapsed = now - current.pendingSeekAtMs;
        if (elapsed >= PLAYBACK_PENDING_SEEK_GRACE_MS) {
            // Grace expired; drop the flag and accept whatever's incoming.
            nextPendingSeekTargetMs = undefined;
            nextPendingSeekAtMs = undefined;
        } else {
            const eventPositionMs = event.positionMs;
            const nearTarget =
                eventPositionMs !== undefined &&
                Math.abs(eventPositionMs - current.pendingSeekTargetMs) <=
                    PLAYBACK_PENDING_SEEK_TARGET_TOLERANCE_MS;
            if (nearTarget) {
                // Engine confirmed the seek — accept and release the grace.
                nextPositionMs = eventPositionMs;
                nextPendingSeekTargetMs = undefined;
                nextPendingSeekAtMs = undefined;
            } else {
                // Stale echo or intermediate buffering sample — hold target.
                nextPositionMs = current.pendingSeekTargetMs;
            }
        }
    } else if (
        current.pendingSeekTargetMs !== undefined ||
        current.pendingSeekAtMs !== undefined
    ) {
        // Track change or end — the seek context is no longer relevant.
        nextPendingSeekTargetMs = undefined;
        nextPendingSeekAtMs = undefined;
    }

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
        nextDecodedFormat === current.decodedFormat &&
        nextSessionId === current.sessionId &&
        nextPendingSeekTargetMs === current.pendingSeekTargetMs &&
        nextPendingSeekAtMs === current.pendingSeekAtMs &&
        Math.abs((nextPositionMs ?? 0) - (current.positionMs ?? 0)) < threshold
    ) {
        return current;
    }

    return {
        ...current,
        bitPerfect: nextBitPerfect,
        decodedFormat: nextDecodedFormat,
        durationMs: nextDurationMs,
        item: activeItem,
        message: nextMessage,
        pendingSeekAtMs: nextPendingSeekAtMs,
        pendingSeekTargetMs: nextPendingSeekTargetMs,
        positionMs: nextPositionMs,
        sessionId: nextSessionId,
        status: nextStatus,
    };
};

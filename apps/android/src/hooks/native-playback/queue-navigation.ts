import {
    getAndroidPlaybackStatus,
    isAndroidNativePlaybackAvailable,
    playAndroidQueueIndex,
    shouldMirrorPlaybackQueueToNative,
    subscribeToAndroidNavigationRequests,
} from '../../services/audio-playback';
import { getPlaybackQueue, setPlaybackQueue } from '../../state/playback-queue-store';
import { getAndroidPlaybackState, setAndroidPlaybackState } from '../../state/playback-store';
import { buildPlaybackProgressContextFromPlayable } from '../../utils/playback-progress-math';
import { withResumePosition } from '../../utils/playback-resume';
import { getPlaybackItemDurationMs } from '../../utils/playback-time';
import { type NativePlaybackContext } from './context';
import { syncPlaybackFromNativeEvent } from './event-sync';
import { playQueuedItem } from './play-item';

/**
 * In-app Next/Prev/queue-tap through the SAME native primitive as the lock
 * screen: an atomic step on the already-loaded Media3 playlist. No new
 * session, no token prep, no stop()+clearMediaItems() teardown — which is
 * why the lock-screen buttons never glitched while the in-app ones did.
 *
 * JS commits the target optimistically (item, queue index, playhead at the
 * track start) under the SAME session, and arms the pending-item lock so a
 * trailing tick from the outgoing track can't drag the UI back during the
 * handoff. Native's transition event then confirms the same item — the
 * exact path a lock-screen skip already takes.
 *
 * Returns false (with no state committed, or with the lock released) when
 * the native queue can't take the command; the caller falls back to the
 * full playQueuedItem restart.
 */
export const playQueueIndexNatively = async (
    ctx: NativePlaybackContext,
    targetIndex: number,
): Promise<boolean> => {
    if (!isAndroidNativePlaybackAvailable()) {
        return false;
    }
    // Cast playback is driven entirely from JS; the native queue
    // primitive only steps the local player.
    if (ctx.castConnectedRef.current) {
        return false;
    }

    const queue = getPlaybackQueue();
    const target = queue?.items[targetIndex];
    const snapshot = ctx.playbackSnapshotRef.current;
    const playbackState = getAndroidPlaybackState();
    if (!queue || !target || !snapshot || playbackState.status === 'idle') {
        return false;
    }
    // Re-tapping the playing row keeps its historical "restart with a
    // fresh resume lookup" semantics via the playQueuedItem path.
    if (targetIndex === queue.index || target.id === snapshot.item.id) {
        return false;
    }
    if (target.source === 'radio' || !shouldMirrorPlaybackQueueToNative(queue)) {
        return false;
    }

    // Optimistic commit — same session, new item. Music starts at 0;
    // long-form starts at the resume the queue item was built with
    // (identical to what the native transition handler applies).
    const sessionId = snapshot.sessionId;
    const startPositionMs =
        target.source === 'music' ? 0 : Math.max(0, target.initialPositionSeconds ?? 0) * 1000;
    ctx.playbackSnapshotRef.current = { item: target, sessionId };
    ctx.pendingItemSessionRef.current = sessionId;
    ctx.progressContextRef.current = buildPlaybackProgressContextFromPlayable(
        target,
        ctx.serverConnectionsRef.current,
    );
    setPlaybackQueue({ ...queue, index: targetIndex });
    setAndroidPlaybackState((current) =>
        current.status === 'idle'
            ? current
            : {
                  ...current,
                  durationMs: getPlaybackItemDurationMs(target),
                  item: target,
                  message: undefined,
                  pendingSeekAtMs: Date.now(),
                  pendingSeekTargetMs: startPositionMs,
                  positionMs: startPositionMs,
                  sessionId,
                  status: 'buffering',
              },
    );

    try {
        const event = await playAndroidQueueIndex(targetIndex, target.id);
        if (event.handled) {
            return true;
        }
    } catch {
        // Bridge failure — fall back below.
    }

    // Native declined: release the lock so events flow again and let
    // the caller run the full restart path for the same target.
    ctx.pendingItemSessionRef.current = null;
    return false;
};

/** JS-side queue advance (native's advance failed or JS owns this queue). */
export const advanceQueue = async (ctx: NativePlaybackContext): Promise<void> => {
    const queue = getPlaybackQueue();
    const nextIndex = queue ? queue.index + 1 : -1;
    const nextItem = queue?.items[nextIndex];
    if (!queue || !nextItem) {
        return;
    }

    const endedSessionId = ctx.playbackSnapshotRef.current?.sessionId ?? null;
    if (endedSessionId && ctx.lastAdvancedFromSessionRef.current === endedSessionId) {
        return;
    }
    if (ctx.queueAdvanceInFlightRef.current) {
        return;
    }

    ctx.queueAdvanceInFlightRef.current = true;

    try {
        await playQueuedItem(ctx, nextItem, queue.items, nextIndex, {
            omitTrackRecentlyPlayed: queue.omitTrackRecentlyPlayed,
            samoPlaylistId: queue.samoPlaylistId,
            skipResumeRefresh: true,
        });

        let state = getAndroidPlaybackState();
        let sessionId = ctx.playbackSnapshotRef.current?.sessionId;
        if (state.status === 'error' && sessionId && state.sessionId === sessionId) {
            await playQueuedItem(ctx, nextItem, queue.items, nextIndex, {
                omitTrackRecentlyPlayed: queue.omitTrackRecentlyPlayed,
                samoPlaylistId: queue.samoPlaylistId,
                skipResumeRefresh: true,
            });
            state = getAndroidPlaybackState();
            sessionId = ctx.playbackSnapshotRef.current?.sessionId;
        }

        if (
            endedSessionId &&
            state.status !== 'error' &&
            state.status !== 'idle' &&
            sessionId &&
            sessionId !== endedSessionId
        ) {
            ctx.lastAdvancedFromSessionRef.current = endedSessionId;
        }
    } finally {
        ctx.queueAdvanceInFlightRef.current = false;
    }
};

export const catchUpQueueAfterForeground = async (ctx: NativePlaybackContext): Promise<void> => {
    const queue = getPlaybackQueue();
    if (!queue) {
        return;
    }

    try {
        const event = await getAndroidPlaybackStatus();
        syncPlaybackFromNativeEvent(ctx, event);

        // Recover a stream the native player gave up on. A long screen-off
        // network outage (e.g. a podcast playing in a pocket) can exhaust the
        // player's reconnect budget — it stops and goes idle while JS, frozen
        // by Doze, still believes the track is playing. Neither side resumes
        // on its own, so the user returns to dead audio that "just sits
        // there." When we come back to the foreground and find the player
        // idle/errored under an item we last saw PLAYING, re-prepare it from
        // the last known position so playback simply picks back up. Paused or
        // ended items are deliberately left alone — a paused track resumes via
        // the play button, never unprompted on unlock.
        const snapshot = ctx.playbackSnapshotRef.current;
        const jsState = getAndroidPlaybackState();
        const wasPlaying =
            jsState.status === 'playing' ||
            jsState.status === 'buffering' ||
            jsState.status === 'loading';
        if (snapshot && wasPlaying && (event.status === 'idle' || event.status === 'error')) {
            // `wasPlaying` already narrowed jsState to a non-idle state, so
            // positionMs is the last playhead JS saw before Doze froze it.
            const positionMs = jsState.positionMs ?? 0;
            const resumeSeconds = positionMs > 0 ? Math.floor(positionMs / 1000) : 0;
            await playQueuedItem(
                ctx,
                withResumePosition(snapshot.item, resumeSeconds),
                queue.items,
                queue.index,
                { skipResumeRefresh: true },
            );
            return;
        }

        if (event.status !== 'ended') {
            return;
        }

        // We woke up to a queue with a next item but native is in ENDED.
        // That means native auto-advance (which Kotlin always owns now)
        // failed — most likely a Samo token mint that couldn't complete
        // while the device was offline, or the recovery layer parked
        // playback. JS, now awake with fresh auth, retries the advance.
        if (queue.index + 1 < queue.items.length) {
            await advanceQueue(ctx);
        }
    } catch {
        // Best-effort when returning from background.
    }
};

/**
 * Native "couldn't step the queue" backstop. Native
 * (SamoAudioEngine.tryNavigateNativeQueue) already tried to step within the
 * mirrored queue before emitting this event — by the time JS hears it, native
 * genuinely couldn't advance (queue mirror exhausted or out of sync).
 */
export const attachNavigationRequestSubscription = (
    ctx: NativePlaybackContext,
): (() => void) => {
    const subscription = subscribeToAndroidNavigationRequests((event) => {
        // A navigation request is a statement about the session it was
        // born under ("this session's queue can't advance natively"). If
        // the user has since committed a NEW session, the request is
        // stale — consuming it against the fresh queue advanced it off
        // its first track (the shuffle-skips-song-1 race).
        if (event.sessionId && ctx.playbackSnapshotRef.current?.sessionId !== event.sessionId) {
            return;
        }
        const direction = event.direction === -1 ? -1 : 1;
        // If the JS queue still has a next item, retry the advance from here
        // with fresh auth before falling through to `navigateRef`, the "jump
        // out of the current queue" path (next episode, chapter).
        if (direction === 1) {
            const queue = getPlaybackQueue();
            if (queue && queue.index + 1 < queue.items.length) {
                void advanceQueue(ctx);
                return;
            }
        }
        void ctx.navigateRef.current?.(direction);
    });
    return () => subscription.remove();
};

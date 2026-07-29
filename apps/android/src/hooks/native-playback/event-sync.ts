import {
    type AndroidNativePlaybackEvent,
    subscribeToAndroidAudioEvents,
} from '../../services/audio-playback';
import { getPlaybackQueue, setPlaybackQueue } from '../../state/playback-queue-store';
import { getAndroidPlaybackState, setAndroidPlaybackState } from '../../state/playback-store';
import { buildPlaybackProgressContextFromPlayable } from '../../utils/playback-progress-math';
import { reducePlaybackStateFromEvent } from '../../utils/playback-reduce';
import {
    getResumePositionSeconds,
    shouldAutoRecoverPlayback,
    withResumePosition,
} from '../../utils/playback-resume';
import {
    getActivePlaybackStatus,
    resolvePlaybackProgressFromEvent,
} from '../../utils/playback-time';
import { type NativePlaybackContext, type PlaybackSnapshot } from './context';
import { playQueuedItem } from './play-item';

export const shouldAcceptPlaybackEvent = (
    ctx: NativePlaybackContext,
    event: Pick<AndroidNativePlaybackEvent, 'sessionId' | 'source' | 'status'>,
    snapshot: null | PlaybackSnapshot,
): boolean => {
    if (!snapshot) {
        return false;
    }
    // Reject trailing echoes from a session we deliberately skipped away
    // from — otherwise the just-left track can snap the queue backward.
    if (event.sessionId && ctx.retiredSessionsRef.current.has(event.sessionId)) {
        return false;
    }
    if (event.status === 'ended') {
        return !event.sessionId || event.sessionId === snapshot.sessionId;
    }
    if (!event.sessionId) {
        // A sessionless echo must never move us off the CURRENT item.
        // Older native builds emit position/status ticks with no session
        // id; during a Next/Prev (or a queue tap) a trailing tick for the
        // just-left track would otherwise flip the player back to it for a
        // frame or two before the new session's events take over — the
        // visible "song flips back and forth before playing" bug. Only
        // accept a sessionless echo when it is about the item we're on.
        const echoItemId = event.source?.id;
        return !echoItemId || echoItemId === snapshot.item.id;
    }
    if (event.sessionId === snapshot.sessionId) {
        return true;
    }
    // Native auto-advanced while JS was suspended (screen off / background).
    const queue = getPlaybackQueue();
    const eventSourceId = event.source?.id;
    if (queue && eventSourceId) {
        return queue.items.some((item) => item.id === eventSourceId);
    }
    return false;
};

export const syncPlaybackFromNativeEvent = (
    ctx: NativePlaybackContext,
    event: AndroidNativePlaybackEvent,
): void => {
    const queue = getPlaybackQueue();
    if (!queue) {
        return;
    }

    // Single-owner lock for the active item. When JS commits a new track
    // (playQueuedItem), native's in-flight transition events still name
    // the OUTGOING track for a beat. Reconciling the queue/item from those
    // drags the snapshot — and therefore the player — back to the old song
    // before the new track's events land (the "switches between the two
    // songs really fast" bug). So while a committed item is unconfirmed,
    // ignore events that name a different track; the first event that names
    // our track confirms it and hands authority back to native (needed for
    // background gapless auto-advance).
    const lockSnapshot = ctx.playbackSnapshotRef.current;
    const eventItemId = event.source?.id;
    if (
        lockSnapshot &&
        ctx.pendingItemSessionRef.current === lockSnapshot.sessionId &&
        eventItemId
    ) {
        if (eventItemId === lockSnapshot.item.id) {
            ctx.pendingItemSessionRef.current = null;
        } else {
            return;
        }
    }

    // Trust the native numeric index only when it actually points at the
    // track the event reports — a bare index from a stale echo must never
    // move the queue on its own. (Disambiguates duplicate queue items.)
    const eventSourceId = event.source?.id;
    if (
        event.queueIndex != null &&
        event.queueIndex >= 0 &&
        event.queueIndex !== queue.index &&
        (eventSourceId == null || queue.items[event.queueIndex]?.id === eventSourceId)
    ) {
        setPlaybackQueue({
            ...queue,
            index: event.queueIndex,
        });
    }

    const sourceId = event.source?.id;
    if (!sourceId || !event.sessionId) {
        return;
    }

    const nextIndex = queue.items.findIndex((item) => item.id === sourceId);
    if (nextIndex < 0) {
        return;
    }

    if (nextIndex !== getPlaybackQueue()?.index) {
        setPlaybackQueue({
            ...queue,
            index: nextIndex,
        });
    }

    const item = queue.items[nextIndex]!;
    const snapshotChanged =
        ctx.playbackSnapshotRef.current?.sessionId !== event.sessionId ||
        ctx.playbackSnapshotRef.current?.item.id !== item.id;

    if (snapshotChanged) {
        ctx.playbackSnapshotRef.current = { item, sessionId: event.sessionId };
        // Native advanced (queue auto-advance, prev/next from notif, or
        // a background continuation). Rebuild the ABS progress context
        // for the new item so the JS poll writes progress against the
        // right episode/file — otherwise the previous track's context
        // keeps accumulating against whatever is playing now.
        ctx.progressContextRef.current = buildPlaybackProgressContextFromPlayable(
            item,
            ctx.serverConnectionsRef.current,
        );
    }

    if (!snapshotChanged) {
        return;
    }

    setAndroidPlaybackState((current) => {
        if (current.status === 'idle' || current.item.id === item.id) {
            return current;
        }

        const progress = resolvePlaybackProgressFromEvent(event, current, item);

        return {
            ...current,
            durationMs: progress.durationMs,
            item,
            positionMs: progress.positionMs,
            sessionId: event.sessionId ?? current.sessionId,
            status: getActivePlaybackStatus(event.status, current.status),
        };
    });
};

/**
 * The live native→JS event pipeline: gate each event, fast-path steady-state
 * position ticks, reconcile transitions, and drive the ended / error recovery
 * paths. Returns the unsubscribe (also clears any armed recovery timer).
 */
export const attachNativeAudioEventSubscription = (ctx: NativePlaybackContext): (() => void) => {
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined;

    const subscription = subscribeToAndroidAudioEvents((event) => {
        const snapshot = ctx.playbackSnapshotRef.current;

        if (!shouldAcceptPlaybackEvent(ctx, event, snapshot) || !snapshot) {
            return;
        }

        // FAST PATH for the native 1Hz position ticker: a steady-state
        // tick (same item, still playing, no pending commit) carries no
        // transition information — skip the reconcile machinery and apply
        // the position straight through the reducer. Keeps the per-second
        // JS cost of playback near zero so navigation stays responsive
        // while a song plays.
        if (
            event.status === 'playing' &&
            event.source?.id === snapshot.item.id &&
            ctx.pendingItemSessionRef.current === null &&
            getAndroidPlaybackState().status === 'playing'
        ) {
            // Pre-check: skip the reducer entirely when the position
            // tick is below the threshold. Avoids the function-call
            // overhead of the updater + reducer on every sub-250ms tick
            // (native can fire faster than 1Hz during buffering catch-up).
            const currentState = getAndroidPlaybackState();
            if (
                currentState.status !== 'idle' &&
                event.positionMs !== undefined &&
                currentState.positionMs !== undefined &&
                Math.abs(event.positionMs - currentState.positionMs) < 250
            ) {
                return;
            }
            setAndroidPlaybackState((current) =>
                reducePlaybackStateFromEvent(current, event, snapshot, {
                    minPositionDeltaMs: 250,
                    preserveMessage: true,
                }),
            );
            return;
        }

        syncPlaybackFromNativeEvent(ctx, event);

        if (event.status === 'playing') {
            ctx.playbackRecoveryAttemptRef.current = 0;
        }

        // Per-track + per-playlist progress + scrobble writes are owned by
        // SamoProgressSync.kt (Kotlin owns progress sync). The native side
        // calls attach() at play, setPlaying() on the player listener, and
        // detach(completed=true) on natural end — so the server sees
        // started/position/submitted writes whether JS is awake or
        // Doze-frozen.

        if (event.status === 'ended') {
            const queue = getPlaybackQueue();
            const hasQueuedNext = queue != null && queue.index + 1 < queue.items.length;

            // Within-queue advancement is owned natively for every
            // mirrored queue (music plays as a full Media3 playlist;
            // podcast / multi-file audiobook / mixed advance via
            // SamoAudioEngine.requestQueueAdvanceFromEnded). The JS-side
            // backstop for a failed native advance is the
            // SamoAudioNavigationRequest subscription — not this handler.
            if (
                !hasQueuedNext &&
                (snapshot.item.source === 'audiobook' || snapshot.item.source === 'podcast')
            ) {
                // End of the queue on a long-form item: step to the next
                // episode/chapter beyond the queue via the registered
                // handler.
                void ctx.navigateRef.current?.(1);
            }
        }

        if (event.status === 'error') {
            const playbackState = getAndroidPlaybackState();
            const positionMs =
                playbackState.status !== 'idle' ? playbackState.positionMs : undefined;
            // SamoProgressSync.setPlaying(false) fires from the player
            // listener on the isPlaying→false transition that accompanies
            // an error, so the latest position is already written to the
            // server. No JS-side write needed here anymore.

            // Native SamoLiveReconnect already retries transient network
            // errors. Only fall back to a full JS restart after that path
            // surfaces an error, and never during the first seconds of a
            // new session (avoids fighting native prepare/reconnect).
            const elapsedMs = Date.now() - ctx.playbackStartedAtRef.current;
            const nativeReconnectLikelyDone = elapsedMs > 12_000;

            if (
                nativeReconnectLikelyDone &&
                shouldAutoRecoverPlayback(snapshot.item.source) &&
                ctx.playbackRecoveryAttemptRef.current < 1
            ) {
                ctx.playbackRecoveryAttemptRef.current += 1;
                setAndroidPlaybackState((current) =>
                    current.status === 'idle'
                        ? current
                        : {
                              ...current,
                              message: 'Reconnecting…',
                              status: 'buffering',
                          },
                );
                recoveryTimer = setTimeout(() => {
                    if (ctx.playbackSnapshotRef.current?.sessionId !== snapshot.sessionId) {
                        return;
                    }
                    void playQueuedItem(
                        ctx,
                        withResumePosition(
                            snapshot.item,
                            positionMs && positionMs > 0
                                ? Math.floor(positionMs / 1000)
                                : getResumePositionSeconds(snapshot.item, playbackState),
                        ),
                        getPlaybackQueue()?.items,
                        getPlaybackQueue()?.index,
                    );
                }, 1500);
                return;
            }
        }

        setAndroidPlaybackState((current) =>
            reducePlaybackStateFromEvent(current, event, ctx.playbackSnapshotRef.current, {
                updateSessionId: true,
            }),
        );
    });

    return () => {
        subscription.remove();
        if (recoveryTimer) {
            clearTimeout(recoveryTimer);
        }
    };
};

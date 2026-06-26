import { type ServerAuthenticationResult } from '@samo/core/server';
import type { MobilePlayableAudio } from '@samo/core/mobile';
import { createPlaybackSession } from '@samo/core/playback';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { AppState } from 'react-native';

import {
    type AndroidNativePlaybackEvent,
    getAndroidAudioDeviceInfo,
    getAndroidPlaybackStatus,
    isAndroidNativePlaybackAvailable,
    playAndroidAudio,
    playAndroidQueueIndex,
    seekAndroidAudio,
    shouldMirrorPlaybackQueueToNative,
    subscribeToAndroidAudioEvents,
    syncAndroidNativePlaybackQueue,
    subscribeToAndroidNavigationRequests,
} from '../services/audio-playback';
import type { AbsProgressContext } from '../services/abs-progress';
import { buildAbsProgressContextFromPlayable } from '../utils/abs-progress-math';
import { setAppSessionIsShuffled, useAppSessionSelector } from '../state/app-session';
import {
    type AndroidPlaybackQueue,
    getPlaybackQueue,
    setPlaybackQueue,
} from '../state/playback-queue-store';
import {
    getAndroidPlaybackState,
    selectAndroidPlaybackStatus,
    setAndroidPlaybackState,
    useAndroidPlaybackState,
} from '../state/playback-store';
import { buildRecoveredPlaybackItem } from '../utils/playback-recovery';
import { reducePlaybackStateFromEvent } from '../utils/playback-reduce';
import {
    getResumePositionSeconds,
    mergePreparedQueueItem,
    refreshPlayableResumeFromServerBounded,
    shouldAutoRecoverPlayback,
    withResumePosition,
} from '../utils/playback-resume';
import { preparePlaybackItemForNative } from '../utils/samo-artwork-url';
import { streamUrlHasEmbeddedResume } from '../utils/stream-resume-url';
import { resolveLocalPlayback } from '../utils/offline-playback';
import { shouldServerSeekAudiobookMp3 } from '../utils/samo-audiobook-playback';
import {
    getActivePlaybackStatus,
    getPlaybackEventDurationMs,
    getPlaybackItemDurationMs,
    PLAYBACK_PENDING_SEEK_TARGET_TOLERANCE_MS,
    resolvePlaybackProgressFromEvent,
} from '../utils/playback-time';
import { setDownloadsPlaybackActive } from '../services/download-manager';

export type { AndroidPlaybackQueue };

/**
 * The cue shown on the optimistic mini-player during the start-up window
 * (token mint + stream resolve + first buffer), so a tap reads as "starting"
 * not "stuck". Music starts fast enough to need none.
 */
const getPlaybackStartMessage = (item: MobilePlayableAudio): string | undefined => {
    switch (item.source) {
        case 'radio':
            return 'Tuning in…';
        case 'podcast':
            return 'Loading episode…';
        case 'audiobook':
            return 'Loading audiobook…';
        default:
            return undefined;
    }
};

export type AndroidPlayItemOptions = {
    /** Samo audiobook: open stream at this book-global second (skips server resume overlay). */
    bookStartSeconds?: number;
    omitTrackRecentlyPlayed?: boolean;
    /** Queue auto-advance / next file — do not overlay ABS saved book progress. */
    skipResumeRefresh?: boolean;
    samoPlaylistId?: string;
    shuffled?: boolean;
};

export interface AndroidNativePlaybackController {
    absContextRef: MutableRefObject<AbsProgressContext | null>;
    handlePlayItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
    hydrateNativePlaybackState: () => Promise<void>;
    playbackSnapshotRef: MutableRefObject<null | {
        item: MobilePlayableAudio;
        sessionId: string;
    }>;
    /**
     * Step playback to another queue entry through the native queue primitive
     * (the same one the lock screen uses). Returns false when native can't
     * take it — the caller then falls back to a full playQueuedItem restart.
     */
    playQueueIndexNatively: (targetIndex: number) => Promise<boolean>;
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
    registerNavigatePlayback: (handler: (direction: -1 | 1) => Promise<void>) => void;
}

export function useAndroidNativePlayback(options: {
    lastPlayedItem: MobilePlayableAudio | null;
    serverConnection: ServerAuthenticationResult | null;
}): AndroidNativePlaybackController {
    const { lastPlayedItem, serverConnection } = options;
    // Slice subscription: this hook only cares whether cast owns playback. The
    // full session store changes on every recents/favorites write, which used
    // to re-render this hook (and recreate its callbacks) constantly.
    const castConnected = useAppSessionSelector((state) => state.castState.isConnected);

    const playbackStatus = useAndroidPlaybackState(selectAndroidPlaybackStatus);
    const absContextRef = useRef<AbsProgressContext | null>(null);
    const playbackSequenceRef = useRef(0);
    const playbackRecoveryAttemptRef = useRef(0);
    const playbackStartedAtRef = useRef(0);
    const playbackSnapshotRef = useRef<null | { item: MobilePlayableAudio; sessionId: string }>(
        null,
    );
    // Live handles for values the playback callbacks need without being
    // recreated on every auth/cast change. A recreated playQueuedItem used to
    // cascade: advanceQueue → the audio-event subscription → a teardown +
    // resubscribe on every server-health tick, with a window where native
    // events were dropped. Reading through refs keeps every playback callback
    // referentially stable for the life of the hook.
    const serverConnectionsRef = useRef<ServerAuthenticationResult | null>(serverConnection);
    useEffect(() => {
        serverConnectionsRef.current = serverConnection;
    }, [serverConnection]);
    const castConnectedRef = useRef(castConnected);
    useEffect(() => {
        castConnectedRef.current = castConnected;
    }, [castConnected]);
    // Sessions JS deliberately skipped away from. After we start the next track
    // (a new session), native can still emit a trailing status echo for the
    // just-left track on its OLD session; rejecting those stale echoes keeps the
    // queue index from flickering backward on Next/Prev.
    const retiredSessionsRef = useRef<Set<string>>(new Set());
    // The session whose freshly-committed active item native has NOT yet
    // confirmed. While set, native's in-flight transition events (which still
    // name the OUTGOING track during a Next/Prev or queue tap) must not move the
    // active item — otherwise the player flickers between the two songs before
    // the new one's events arrive. Cleared the instant native reports our item.
    const pendingItemSessionRef = useRef<string | null>(null);

    const shouldAcceptPlaybackEvent = useCallback(
        (
            event: Pick<AndroidNativePlaybackEvent, 'sessionId' | 'source' | 'status'>,
            snapshot: { item: MobilePlayableAudio; sessionId: string } | null,
        ) => {
            if (!snapshot) {
                return false;
            }
            // Reject trailing echoes from a session we deliberately skipped away
            // from — otherwise the just-left track can snap the queue backward.
            if (event.sessionId && retiredSessionsRef.current.has(event.sessionId)) {
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
        },
        [],
    );

    const syncPlaybackFromNativeEvent = useCallback(
        (event: AndroidNativePlaybackEvent) => {
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
            const lockSnapshot = playbackSnapshotRef.current;
            const eventItemId = event.source?.id;
            if (
                lockSnapshot &&
                pendingItemSessionRef.current === lockSnapshot.sessionId &&
                eventItemId
            ) {
                if (eventItemId === lockSnapshot.item.id) {
                    pendingItemSessionRef.current = null;
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
                playbackSnapshotRef.current?.sessionId !== event.sessionId ||
                playbackSnapshotRef.current?.item.id !== item.id;

            if (snapshotChanged) {
                playbackSnapshotRef.current = { item, sessionId: event.sessionId };
                // Native advanced (queue auto-advance, prev/next from notif, or
                // a background continuation). Rebuild the ABS progress context
                // for the new item so the JS poll writes progress against the
                // right episode/file — otherwise the previous track's context
                // keeps accumulating against whatever is playing now.
                absContextRef.current = buildAbsProgressContextFromPlayable(
                    item,
                    serverConnectionsRef.current,
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
        },
        [],
    );
    const navigateRef = useRef<((direction: -1 | 1) => Promise<void>) | null>(null);
    const queueAdvanceInFlightRef = useRef(false);
    const lastAdvancedFromSessionRef = useRef<string | null>(null);

    const hydrateNativePlaybackState = useCallback(async () => {
        if (!isAndroidNativePlaybackAvailable()) {
            return;
        }

        try {
            const event = await getAndroidPlaybackStatus();
            if (event.status === 'idle') {
                return;
            }

            syncPlaybackFromNativeEvent(event);

            const currentPlaybackState = getAndroidPlaybackState();
            if (currentPlaybackState.status !== 'idle') {
                const sessionMatches =
                    !event.sessionId || event.sessionId === currentPlaybackState.sessionId;
                const queueSourceMatches = Boolean(
                    event.source?.id &&
                        getPlaybackQueue()?.items.some(
                            (item) => item.id === event.source?.id,
                        ),
                );
                if (!sessionMatches && !queueSourceMatches) {
                    return;
                }
            }

            const item =
                playbackSnapshotRef.current?.item ??
                (currentPlaybackState.status !== 'idle'
                    ? currentPlaybackState.item
                    : buildRecoveredPlaybackItem(
                          event,
                          playbackSnapshotRef.current?.item ?? lastPlayedItem,
                      ));
            if (!item) {
                return;
            }

            const sessionId =
                playbackSnapshotRef.current?.sessionId ??
                (currentPlaybackState.status !== 'idle'
                    ? currentPlaybackState.sessionId
                    : (event.sessionId ?? `recovered:${item.id}`));
            playbackSnapshotRef.current = { item, sessionId };
            setAndroidPlaybackState((current) => {
                if (current.status !== 'idle' && current.sessionId !== sessionId) {
                    return current;
                }

                const activeItem =
                    current.status !== 'idle' && current.sessionId === sessionId
                        ? current.item
                        : item;
                const progress =
                    current.status === 'idle'
                        ? {
                              durationMs: getPlaybackEventDurationMs(event, activeItem),
                              positionMs: event.positionMs,
                          }
                        : resolvePlaybackProgressFromEvent(event, current, activeItem);

                return {
                    bitPerfect:
                        event.bitPerfect ??
                        (current.status === 'idle' ? undefined : current.bitPerfect),
                    durationMs: progress.durationMs,
                    item: activeItem,
                    message:
                        event.message ?? (current.status === 'idle' ? undefined : current.message),
                    positionMs: progress.positionMs,
                    sessionId,
                    status: getActivePlaybackStatus(
                        event.status,
                        current.status === 'idle' ? 'paused' : current.status,
                    ),
                };
            });
        } catch {
            // Best-effort recovery; live subscription still owns updates.
        }
    }, [lastPlayedItem, syncPlaybackFromNativeEvent]);

    const playQueuedItem = useCallback(
        async (
            item: MobilePlayableAudio,
            queueItems: MobilePlayableAudio[] = [item],
            queueIndex?: number,
            playOptions?: AndroidPlayItemOptions,
        ) => {
            if (!isAndroidNativePlaybackAvailable()) {
                setAndroidPlaybackState({
                    item,
                    message: 'Native Android audio engine is not available in this build.',
                    sessionId: 'unavailable',
                    status: 'error',
                });
                return;
            }

            const playableQueueItems = queueItems.length > 0 ? queueItems : [item];
            const requestedQueueIndex =
                queueIndex ??
                Math.max(
                    0,
                    playableQueueItems.findIndex((candidate) => candidate.id === item.id),
                );
            const nextQueueIndex = Math.min(
                Math.max(0, requestedQueueIndex),
                Math.max(0, playableQueueItems.length - 1),
            );
            const playbackState = getAndroidPlaybackState();
            const explicitBookStart = playOptions?.bookStartSeconds;
            const skipResumeRefresh = playOptions?.skipResumeRefresh === true;

            // ── Synchronous commit phase — NO awaits above the loading write. ──
            //
            // The tap must paint NOW. This block (session, snapshot, lock,
            // queue, loading state) runs before any network wait, which buys
            // two structural guarantees:
            //  1. A tap always responds instantly, even when the server is
            //     slow — the old order awaited a server progress read FIRST,
            //     so a sick server made taps look completely dead.
            //  2. The snapshot commit IS the request-generation guard: a newer
            //     tap overwrites it synchronously, and every await below is
            //     followed by an isCurrentPlaybackSession() check — a stale
            //     tap's continuation aborts instead of stomping the user's
            //     latest choice. Without this, every tap made during a slow
            //     spell queued up and then REPLAYED in completion order (the
            //     "everything I tried flashes through the screen" pile-up).
            //
            // The provisional start position is the item's own resume; the
            // server overlay below may move it (same session) before play().
            const provisionalResumeSeconds =
                explicitBookStart !== undefined
                    ? 0
                    : (item.initialPositionSeconds ??
                      (skipResumeRefresh
                          ? 0
                          : (getResumePositionSeconds(item, playbackState) ?? 0)));
            const provisionalPositionMs =
                provisionalResumeSeconds > 0 ? provisionalResumeSeconds * 1000 : 0;

            const session = createPlaybackSession({
                engine: 'android-native',
                mediaKey: item.id,
                sequence: (playbackSequenceRef.current += 1),
                source: item.source,
            });
            if (playOptions?.shuffled !== undefined) {
                setAppSessionIsShuffled(playOptions.shuffled);
            }

            setPlaybackQueue({
                index: nextQueueIndex,
                items: playableQueueItems,
                omitTrackRecentlyPlayed: playOptions?.omitTrackRecentlyPlayed,
                samoPlaylistId: playOptions?.samoPlaylistId,
            });
            // Deliberately NO syncAndroidNativePlaybackQueue here: the play()
            // payload below carries the full queue atomically. A pre-play sync
            // made the native side reconcile the NEW queue against the OLD
            // still-playing playlist (rewriting the live player and mutating
            // the mirror's index) milliseconds before play() rebuilt
            // everything anyway — a second writer racing the play command for
            // zero benefit. Up-Next EDITS (enqueue/reorder/shuffle-toggle)
            // still sync explicitly from their own handlers.
            const supersededSessionId = playbackSnapshotRef.current?.sessionId;
            if (supersededSessionId && supersededSessionId !== session.id) {
                const retired = retiredSessionsRef.current;
                retired.add(supersededSessionId);
                while (retired.size > 8) {
                    const oldest = retired.values().next().value;
                    if (oldest === undefined) break;
                    retired.delete(oldest);
                }
            }
            playbackSnapshotRef.current = { item, sessionId: session.id };
            pendingItemSessionRef.current = session.id;
            playbackRecoveryAttemptRef.current = 0;
            playbackStartedAtRef.current = Date.now();
            setAndroidPlaybackState({
                durationMs: getPlaybackItemDurationMs(item),
                item,
                // A source-appropriate cue so the optimistic mini-player reads as
                // "starting" rather than "stuck" during the unavoidable token
                // mint + stream resolve + first buffer (radio/podcast can take a
                // few seconds). Cleared by the native event's own `event.message`
                // the instant playback actually begins.
                message: getPlaybackStartMessage(item),
                // Anchor the new session to its intended start. The reducer's
                // pending-seek grace then HOLDS the playhead here and rejects
                // any sample that lands far from it until native confirms the
                // new track is actually playing near the start. This is what
                // stops a trailing position tick from the OUTGOING track (e.g.
                // 0:52 of the song you just skipped) from poisoning the new
                // track's playhead during the Next/Prev transition window — the
                // "hit Next, bar snaps back to the previous song's time and
                // sticks" bug. Identity-agnostic: catches the poison whether the
                // stale tick carries the old source id, the new one, or none.
                pendingSeekAtMs: Date.now(),
                pendingSeekTargetMs: provisionalPositionMs,
                positionMs: provisionalPositionMs,
                sessionId: session.id,
                status: 'loading',
            });
            absContextRef.current = buildAbsProgressContextFromPlayable(
                item,
                serverConnectionsRef.current,
            );
            const isCommittedPlaybackSession = () =>
                playbackSnapshotRef.current?.sessionId === session.id;

            // ── Async phase — every await is followed by a session check. ──
            const baseItem =
                explicitBookStart !== undefined && item.source === 'audiobook'
                    ? item
                    : skipResumeRefresh
                      ? item
                      : item.source === 'podcast' || item.source === 'audiobook'
                        ? await refreshPlayableResumeFromServerBounded(
                              item,
                              serverConnectionsRef.current,
                          )
                        : item;
            if (!isCommittedPlaybackSession()) return;
            const resumeSeconds =
                explicitBookStart !== undefined
                    ? 0
                    : skipResumeRefresh
                      ? (item.initialPositionSeconds ?? 0)
                      : (getResumePositionSeconds(baseItem, playbackState) ?? 0);
            // For an MP3 audiobook, open the stream PRE-POSITIONED at the resume second
            // via the server's frame-accurate seek instead of a native seek. ExoPlayer's
            // Xing seek lands tens of seconds off on a long VBR file, and a deep native
            // seek can stall the load for minutes; opening the byte-positioned stream is
            // instant and exact. progressOffsetSeconds becomes the book-time at the
            // stream's start and there is no native seek (initialPositionMs = 0).
            const prePositionResume =
                resumeSeconds > 0 &&
                explicitBookStart === undefined &&
                shouldServerSeekAudiobookMp3(baseItem);
            const itemToPlay = prePositionResume
                ? { ...baseItem, initialPositionSeconds: undefined, progressOffsetSeconds: resumeSeconds }
                : withResumePosition(baseItem, resumeSeconds);
            const initialPositionMs =
                prePositionResume || !resumeSeconds || resumeSeconds <= 0
                    ? 0
                    : resumeSeconds * 1000;
            absContextRef.current = buildAbsProgressContextFromPlayable(
                itemToPlay,
                serverConnectionsRef.current,
            );

            const nativeItem = await preparePlaybackItemForNative(
                itemToPlay,
                serverConnectionsRef.current,
            );
            if (!isCommittedPlaybackSession()) return;
            const currentQueueItem = playableQueueItems[nextQueueIndex];
            // The refreshed slot keeps its ORIGINAL resume semantics — the
            // session's transient start position must not become the slot's
            // permanent one (see mergePreparedQueueItem).
            const queueItemsForSession =
                currentQueueItem &&
                (currentQueueItem.url !== nativeItem.url ||
                    currentQueueItem.castUrl !== nativeItem.castUrl ||
                    currentQueueItem.artworkUrl !== nativeItem.artworkUrl)
                    ? playableQueueItems.map((queueItem, index) =>
                          index === nextQueueIndex
                              ? mergePreparedQueueItem(currentQueueItem, nativeItem)
                              : queueItem,
                      )
                    : playableQueueItems;
            if (queueItemsForSession !== playableQueueItems) {
                setPlaybackQueue({
                    index: nextQueueIndex,
                    items: queueItemsForSession,
                    omitTrackRecentlyPlayed: playOptions?.omitTrackRecentlyPlayed,
                    samoPlaylistId: playOptions?.samoPlaylistId,
                });
            }

            // Re-commit with the prepared item + the final (possibly server-
            // refreshed) start position. Same session — the loading write
            // above already owns the surface; this just settles the details.
            playbackSnapshotRef.current = { item: nativeItem, sessionId: session.id };
            setAndroidPlaybackState((current) =>
                current.status === 'idle' || current.sessionId !== session.id
                    ? current
                    : {
                          ...current,
                          durationMs:
                              getPlaybackItemDurationMs(nativeItem) ?? current.durationMs,
                          item: nativeItem,
                          ...(initialPositionMs !== provisionalPositionMs
                              ? {
                                    pendingSeekAtMs: Date.now(),
                                    pendingSeekTargetMs: initialPositionMs,
                                    positionMs: initialPositionMs,
                                }
                              : {}),
                          status: 'loading',
                      },
            );

            const nativeQueue =
                itemToPlay.source !== 'radio' &&
                shouldMirrorPlaybackQueueToNative({
                    index: nextQueueIndex,
                    items: queueItemsForSession,
                })
                    ? {
                          index: nextQueueIndex,
                          items: queueItemsForSession,
                          samoPlaylistId: playOptions?.samoPlaylistId,
                      }
                    : undefined;

            try {
                const isCurrentPlaybackSession = () =>
                    playbackSnapshotRef.current?.sessionId === session.id;
                const deviceInfoPromise = getAndroidAudioDeviceInfo().catch(() => undefined);
                const playable = castConnectedRef.current
                    ? nativeItem
                    : await resolveLocalPlayback(nativeItem);
                if (!isCurrentPlaybackSession()) return;
                let event = await playAndroidAudio(
                    playable,
                    session.id,
                    nativeItem,
                    nativeQueue,
                    serverConnectionsRef.current,
                );
                if (!isCurrentPlaybackSession()) return;

                const embeddedStreamResume =
                    streamUrlHasEmbeddedResume(nativeItem.url) &&
                    (nativeItem.progressOffsetSeconds ?? 0) > 0;
                const shouldSeekAfterPlay =
                    initialPositionMs > 0 &&
                    !(embeddedStreamResume && !itemToPlay.initialPositionSeconds);
                if (shouldSeekAfterPlay) {
                    event = await seekAndroidAudio(initialPositionMs);
                    if (!isCurrentPlaybackSession()) return;
                }

                const deviceInfo = await deviceInfoPromise;
                if (!isCurrentPlaybackSession()) return;

                setAndroidPlaybackState((current) => {
                    // Do NOT re-stamp the playhead from event.positionMs here. By
                    // the time play()/seek() resolves, that captured value is
                    // unreliable: it can echo the OUTGOING track's old position
                    // (writing it freezes the bar there — the backward guard then
                    // rejects the new track's real, lower ticks until you
                    // pause/play) OR the play-start 0 (which drags the bar back
                    // after a live tick already advanced it: the "Next → 0 → 1 → 0"
                    // blip). The loading write above already set the playhead to
                    // the intended start — 0 for music, the resume point for a
                    // podcast/audiobook — and the live poll/event stream owns it
                    // from there. So keep the playhead this session already has;
                    // only seed it for a brand-new/foreign session.
                    const keptPositionMs =
                        current.status !== 'idle' && current.sessionId === session.id
                            ? (current.positionMs ?? initialPositionMs)
                            : initialPositionMs;

                    // Poison backstop: a trailing tick from the OUTGOING track
                    // can land between the loading write and here and shove the
                    // playhead far past the intended start (e.g. the 0:52 you
                    // skipped from). If the kept playhead isn't plausibly near
                    // where this session is meant to begin, discard it and snap
                    // back to the start. Re-arm the anchor from THIS moment
                    // (playback has actually begun now) so the reducer keeps
                    // holding the start until native reports a real near-start
                    // sample — robust even if the play()/seek() await outran the
                    // loading write's grace window. A legitimately-advanced
                    // playhead is within tolerance of the start at buffering
                    // time, so this never yanks real progress backward.
                    const poisoned =
                        Math.abs(keptPositionMs - initialPositionMs) >
                        PLAYBACK_PENDING_SEEK_TARGET_TOLERANCE_MS;
                    const stillAnchoring =
                        current.status !== 'idle' &&
                        current.sessionId === session.id &&
                        current.pendingSeekTargetMs !== undefined;

                    return {
                        bitPerfect: event.bitPerfect,
                        deviceInfo,
                        durationMs: getPlaybackEventDurationMs(event, nativeItem),
                        item: nativeItem,
                        message: event.message,
                        pendingSeekAtMs: poisoned || stillAnchoring ? Date.now() : undefined,
                        pendingSeekTargetMs:
                            poisoned || stillAnchoring ? initialPositionMs : undefined,
                        positionMs: poisoned ? initialPositionMs : keptPositionMs,
                        sessionId: session.id,
                        status: getActivePlaybackStatus(event.status, 'buffering'),
                    };
                });

                // (Removed) The post-play "pre-refresh the upcoming queue item"
                // pass is gone. Advance-time freshness is native's job now —
                // SamoResolvingDataSource re-mints music/podcast tokens as
                // ExoPlayer opens each source, and the mirror-queue advance path
                // refreshes per item via SamoNativeStreamUrl.refreshQueueItemAsync.
                // The JS pass duplicated that work and re-serialized the ENTIRE
                // queue over the bridge after every single play.
            } catch (error) {
                if (playbackSnapshotRef.current?.sessionId !== session.id) return;
                setAndroidPlaybackState({
                    durationMs: getPlaybackItemDurationMs(nativeItem),
                    item: nativeItem,
                    message: error instanceof Error ? error.message : 'Playback failed',
                    positionMs: initialPositionMs,
                    sessionId: session.id,
                    status: 'error',
                });
            }
        },
        [],
    );

    const handlePlayItem = useCallback(
        async (
            item: MobilePlayableAudio,
            queueItems: MobilePlayableAudio[] = [item],
            queueIndex?: number,
            playOptions?: AndroidPlayItemOptions,
        ) => {
            await playQueuedItem(item, queueItems, queueIndex, playOptions);
        },
        [playQueuedItem],
    );

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
    const playQueueIndexNatively = useCallback(
        async (targetIndex: number): Promise<boolean> => {
            if (!isAndroidNativePlaybackAvailable()) {
                return false;
            }
            // Cast playback is driven entirely from JS; the native queue
            // primitive only steps the local player.
            if (castConnectedRef.current) {
                return false;
            }

            const queue = getPlaybackQueue();
            const target = queue?.items[targetIndex];
            const snapshot = playbackSnapshotRef.current;
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
                target.source === 'music'
                    ? 0
                    : Math.max(0, target.initialPositionSeconds ?? 0) * 1000;
            playbackSnapshotRef.current = { item: target, sessionId };
            pendingItemSessionRef.current = sessionId;
            absContextRef.current = buildAbsProgressContextFromPlayable(
                target,
                serverConnectionsRef.current,
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
            pendingItemSessionRef.current = null;
            return false;
        },
        [],
    );

    const advanceQueue = useCallback(async () => {
        const queue = getPlaybackQueue();
        const nextIndex = queue ? queue.index + 1 : -1;
        const nextItem = queue?.items[nextIndex];
        if (!queue || !nextItem) {
            return;
        }

        const endedSessionId = playbackSnapshotRef.current?.sessionId ?? null;
        if (
            endedSessionId &&
            lastAdvancedFromSessionRef.current === endedSessionId
        ) {
            return;
        }
        if (queueAdvanceInFlightRef.current) {
            return;
        }

        queueAdvanceInFlightRef.current = true;

        try {
            await playQueuedItem(nextItem, queue.items, nextIndex, {
                omitTrackRecentlyPlayed: queue.omitTrackRecentlyPlayed,
                samoPlaylistId: queue.samoPlaylistId,
                skipResumeRefresh: true,
            });

            let state = getAndroidPlaybackState();
            let sessionId = playbackSnapshotRef.current?.sessionId;
            if (
                state.status === 'error' &&
                sessionId &&
                state.sessionId === sessionId
            ) {
                await playQueuedItem(nextItem, queue.items, nextIndex, {
                    omitTrackRecentlyPlayed: queue.omitTrackRecentlyPlayed,
                    samoPlaylistId: queue.samoPlaylistId,
                    skipResumeRefresh: true,
                });
                state = getAndroidPlaybackState();
                sessionId = playbackSnapshotRef.current?.sessionId;
            }

            if (
                endedSessionId &&
                state.status !== 'error' &&
                state.status !== 'idle' &&
                sessionId &&
                sessionId !== endedSessionId
            ) {
                lastAdvancedFromSessionRef.current = endedSessionId;
            }
        } finally {
            queueAdvanceInFlightRef.current = false;
        }
    }, [playQueuedItem]);

    const catchUpQueueAfterForeground = useCallback(async () => {
        const queue = getPlaybackQueue();
        if (!queue) {
            return;
        }

        try {
            const event = await getAndroidPlaybackStatus();
            syncPlaybackFromNativeEvent(event);

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
            const snapshot = playbackSnapshotRef.current;
            const jsState = getAndroidPlaybackState();
            const wasPlaying =
                jsState.status === 'playing' ||
                jsState.status === 'buffering' ||
                jsState.status === 'loading';
            if (
                snapshot &&
                wasPlaying &&
                (event.status === 'idle' || event.status === 'error')
            ) {
                // `wasPlaying` already narrowed jsState to a non-idle state, so
                // positionMs is the last playhead JS saw before Doze froze it.
                const positionMs = jsState.positionMs ?? 0;
                const resumeSeconds = positionMs > 0 ? Math.floor(positionMs / 1000) : 0;
                await playQueuedItem(
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
                await advanceQueue();
            }
        } catch {
            // Best-effort when returning from background.
        }
    }, [advanceQueue, playQueuedItem, syncPlaybackFromNativeEvent]);

    useEffect(() => {
        let recoveryTimer: ReturnType<typeof setTimeout> | undefined;

        const subscription = subscribeToAndroidAudioEvents((event) => {
            const snapshot = playbackSnapshotRef.current;

            if (!shouldAcceptPlaybackEvent(event, snapshot) || !snapshot) {
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
                pendingItemSessionRef.current === null &&
                getAndroidPlaybackState().status === 'playing'
            ) {
                setAndroidPlaybackState((current) =>
                    reducePlaybackStateFromEvent(current, event, snapshot, {
                        minPositionDeltaMs: 250,
                        preserveMessage: true,
                    }),
                );
                return;
            }

            syncPlaybackFromNativeEvent(event);

            if (event.status === 'playing') {
                playbackRecoveryAttemptRef.current = 0;
            }

            // Per-track + per-playlist progress + scrobble writes are now owned
            // by SamoProgressSync.kt (Phase 3 — Kotlin owns progress sync). The
            // native side calls attach() at play, setPlaying() on the player
            // listener, and detach(completed=true) on natural end — so the
            // server sees started/position/submitted writes whether JS is awake
            // or Doze-frozen. Use-android-native-playback.ts used to do them
            // here from a 1-3s interval poll, but that died with the JS thread.

            if (event.status === 'ended') {
                const queue = getPlaybackQueue();
                const hasQueuedNext = queue != null && queue.index + 1 < queue.items.length;

                // Within-queue advancement is owned natively for every
                // mirrored queue (music plays as a full Media3 playlist;
                // podcast / multi-file audiobook / mixed advance via
                // SamoAudioEngine.requestQueueAdvanceFromEnded). The JS-side
                // backstop for a failed native advance is the
                // SamoAudioNavigationRequest subscription below — not this
                // handler.
                if (!hasQueuedNext &&
                    (snapshot.item.source === 'audiobook' ||
                        snapshot.item.source === 'podcast')
                ) {
                    // End of the queue on a long-form item: step to the next
                    // episode/chapter beyond the queue via the registered
                    // handler.
                    void navigateRef.current?.(1);
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
                const elapsedMs = Date.now() - playbackStartedAtRef.current;
                const nativeReconnectLikelyDone = elapsedMs > 12_000;

                if (
                    nativeReconnectLikelyDone &&
                    shouldAutoRecoverPlayback(snapshot.item.source) &&
                    playbackRecoveryAttemptRef.current < 1
                ) {
                    playbackRecoveryAttemptRef.current += 1;
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
                        if (playbackSnapshotRef.current?.sessionId !== snapshot.sessionId) {
                            return;
                        }
                        void playQueuedItem(
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
                reducePlaybackStateFromEvent(current, event, playbackSnapshotRef.current, {
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
    }, [advanceQueue, playQueuedItem, shouldAcceptPlaybackEvent, syncPlaybackFromNativeEvent]);

    useEffect(() => {
        const subscription = subscribeToAndroidNavigationRequests((event) => {
            // A navigation request is a statement about the session it was
            // born under ("this session's queue can't advance natively"). If
            // the user has since committed a NEW session, the request is
            // stale — consuming it against the fresh queue advanced it off
            // its first track (the shuffle-skips-song-1 race).
            if (
                event.sessionId &&
                playbackSnapshotRef.current?.sessionId !== event.sessionId
            ) {
                return;
            }
            const direction = event.direction === -1 ? -1 : 1;
            // Native (SamoAudioEngine.tryNavigateNativeQueue) already tried to
            // step within the mirrored queue before emitting this event — by
            // the time JS hears it, native genuinely couldn't advance (queue
            // mirror exhausted or out of sync). If the JS queue still has a
            // next item, retry the advance from here with fresh auth before
            // falling through to `navigateRef.current?.(direction)`, the
            // "jump out of the current queue" path (next episode, chapter).
            if (direction === 1) {
                const queue = getPlaybackQueue();
                if (queue && queue.index + 1 < queue.items.length) {
                    void advanceQueue();
                    return;
                }
            }
            void navigateRef.current?.(direction);
        });
        return () => subscription.remove();
    }, [advanceQueue]);

    // (Removed) The 1-2s JS getStatusMap position POLL is gone. The native
    // engine pushes a SamoAudioPlaybackState event every second while the
    // local player is playing and the app is foregrounded (SamoAudioEngine's
    // position ticker), and the Cast SDK's ProgressListener does the same for
    // cast sessions — so the seek bar advances off the SAME event stream as
    // every other state change. Native is the source of truth; it pushes, JS
    // never asks.

    useEffect(() => {
        setDownloadsPlaybackActive(playbackStatus !== 'idle');
    }, [playbackStatus]);

    useEffect(() => {
        void hydrateNativePlaybackState();
    }, [hydrateNativePlaybackState]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                // Native auto-advance may have run during sleep; reconcile UI
                // state + retry advance if native failed (out-of-pocket mint
                // failure etc). The background flush JS used to do is owned by
                // SamoProgressSync now and survives Doze inside the foreground
                // service, so we no longer need to fire pending PATCH writes
                // here.
                void hydrateNativePlaybackState().then(() => catchUpQueueAfterForeground());
            }
        });

        return () => subscription.remove();
    }, [catchUpQueueAfterForeground, hydrateNativePlaybackState]);

    const registerNavigatePlayback = useCallback(
        (handler: (direction: -1 | 1) => Promise<void>) => {
            navigateRef.current = handler;
        },
        [],
    );

    return {
        absContextRef,
        handlePlayItem,
        hydrateNativePlaybackState,
        playbackSnapshotRef,
        playQueueIndexNatively,
        playQueuedItem,
        registerNavigatePlayback,
    };
}

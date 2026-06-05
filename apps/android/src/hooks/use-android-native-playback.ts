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
    seekAndroidAudio,
    shouldMirrorPlaybackQueueToNative,
    subscribeToAndroidAudioEvents,
    syncAndroidNativePlaybackQueue,
    subscribeToAndroidNavigationRequests,
} from '../services/audio-playback';
import type { AbsProgressContext } from '../services/abs-progress';
import { buildAbsProgressContextFromPlayable } from '../utils/abs-progress-math';
import { useAppSessionState } from '../state/app-session';
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
    refreshPlayableResumeFromServer,
    shouldAutoRecoverPlayback,
    withResumePosition,
} from '../utils/playback-resume';
import { preparePlaybackItemForNative } from '../utils/samo-artwork-url';
import { streamUrlHasEmbeddedResume } from '../utils/stream-resume-url';
import { resolveLocalPlayback } from '../utils/offline-playback';
import {
    getActivePlaybackStatus,
    getPlaybackEventDurationMs,
    getPlaybackItemDurationMs,
    PLAYBACK_PENDING_SEEK_TARGET_TOLERANCE_MS,
    resolvePlaybackProgressFromEvent,
} from '../utils/playback-time';
import { setDownloadsPlaybackActive } from '../services/download-manager';

export type { AndroidPlaybackQueue };

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
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
    registerNavigatePlayback: (handler: (direction: -1 | 1) => Promise<void>) => void;
}

export function useAndroidNativePlayback(options: {
    isFullPlayerOpen: boolean;
    lastPlayedItem: MobilePlayableAudio | null;
    serverConnections: ServerAuthenticationResult[];
}): AndroidNativePlaybackController {
    const { isFullPlayerOpen, lastPlayedItem, serverConnections } = options;
    const { castState, setIsShuffled } = useAppSessionState();

    const playbackStatus = useAndroidPlaybackState(selectAndroidPlaybackStatus);
    const absContextRef = useRef<AbsProgressContext | null>(null);
    const playbackSequenceRef = useRef(0);
    const playbackRecoveryAttemptRef = useRef(0);
    const playbackStartedAtRef = useRef(0);
    const playbackSnapshotRef = useRef<null | { item: MobilePlayableAudio; sessionId: string }>(
        null,
    );
    // Native auto-advance fires syncPlaybackFromNativeEvent from a [] useCallback
    // closure, so we need a stable handle to the latest serverConnections list to
    // rebuild ABS progress context for the new track without forcing every event
    // subscription to recreate on auth-list changes.
    const serverConnectionsRef = useRef<ServerAuthenticationResult[]>(serverConnections);
    useEffect(() => {
        serverConnectionsRef.current = serverConnections;
    }, [serverConnections]);
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
            const baseItem =
                explicitBookStart !== undefined && item.source === 'audiobook'
                    ? item
                    : skipResumeRefresh
                      ? item
                      : item.source === 'podcast' || item.source === 'audiobook'
                        ? await refreshPlayableResumeFromServer(item, serverConnections)
                        : item;
            const resumeSeconds =
                explicitBookStart !== undefined
                    ? 0
                    : skipResumeRefresh
                      ? (item.initialPositionSeconds ?? 0)
                      : getResumePositionSeconds(baseItem, playbackState);
            const itemToPlay = withResumePosition(baseItem, resumeSeconds);
            const initialPositionMs =
                resumeSeconds && resumeSeconds > 0 ? resumeSeconds * 1000 : 0;

            absContextRef.current = buildAbsProgressContextFromPlayable(
                itemToPlay,
                serverConnections,
            );

            const session = createPlaybackSession({
                engine: 'android-native',
                mediaKey: item.id,
                sequence: (playbackSequenceRef.current += 1),
                source: item.source,
            });
            if (playOptions?.shuffled !== undefined) {
                setIsShuffled(playOptions.shuffled);
            }

            const nativeItem = await preparePlaybackItemForNative(itemToPlay, serverConnections);
            const currentQueueItem = playableQueueItems[nextQueueIndex];
            const queueItemsForSession =
                currentQueueItem &&
                (currentQueueItem.url !== nativeItem.url ||
                    currentQueueItem.castUrl !== nativeItem.castUrl ||
                    currentQueueItem.artworkUrl !== nativeItem.artworkUrl)
                    ? playableQueueItems.map((queueItem, index) =>
                          index === nextQueueIndex ? nativeItem : queueItem,
                      )
                    : playableQueueItems;

            setPlaybackQueue({
                index: nextQueueIndex,
                items: queueItemsForSession,
                omitTrackRecentlyPlayed: playOptions?.omitTrackRecentlyPlayed,
                samoPlaylistId: playOptions?.samoPlaylistId,
            });
            syncAndroidNativePlaybackQueue(getPlaybackQueue(), serverConnections);
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
            playbackSnapshotRef.current = { item: nativeItem, sessionId: session.id };
            pendingItemSessionRef.current = session.id;
            playbackRecoveryAttemptRef.current = 0;
            playbackStartedAtRef.current = Date.now();
            setAndroidPlaybackState({
                durationMs: getPlaybackItemDurationMs(nativeItem),
                item: nativeItem,
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
                pendingSeekTargetMs: initialPositionMs,
                positionMs: initialPositionMs,
                sessionId: session.id,
                status: 'loading',
            });

            const nativeQueue =
                itemToPlay.source !== 'radio' &&
                shouldMirrorPlaybackQueueToNative({ items: queueItemsForSession })
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
                const playable = castState.isConnected
                    ? nativeItem
                    : await resolveLocalPlayback(nativeItem);
                if (!isCurrentPlaybackSession()) return;
                let event = await playAndroidAudio(
                    playable,
                    session.id,
                    nativeItem,
                    nativeQueue,
                    serverConnections,
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

                // Pre-refresh the upcoming queue entry right after playback starts so
                // auto-advance doesn't rely on an item that was prepared long ago.
                const upcomingIndex = nextQueueIndex + 1;
                const upcomingItem = queueItemsForSession[upcomingIndex];
                if (upcomingItem) {
                    void preparePlaybackItemForNative(upcomingItem, serverConnections)
                        .then((preparedUpcoming) => {
                            const queue = getPlaybackQueue();
                            if (
                                !queue ||
                                queue.index !== nextQueueIndex ||
                                queue.items[upcomingIndex]?.id !== upcomingItem.id
                            ) {
                                return;
                            }
                            if (
                                preparedUpcoming.url === queue.items[upcomingIndex]?.url &&
                                preparedUpcoming.castUrl === queue.items[upcomingIndex]?.castUrl &&
                                preparedUpcoming.artworkUrl ===
                                    queue.items[upcomingIndex]?.artworkUrl
                            ) {
                                return;
                            }
                            setPlaybackQueue({
                                ...queue,
                                items: queue.items.map((queueItem, index) =>
                                    index === upcomingIndex ? preparedUpcoming : queueItem,
                                ),
                            });
                            syncAndroidNativePlaybackQueue(getPlaybackQueue(), serverConnections);
                        })
                        .catch(() => undefined);
                }
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
        [castState.isConnected, serverConnections, setIsShuffled],
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
        const subscription = subscribeToAndroidAudioEvents((event) => {
            const snapshot = playbackSnapshotRef.current;

            if (!shouldAcceptPlaybackEvent(event, snapshot) || !snapshot) {
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
                const nativeOwnsFileAdvance =
                    queue != null && shouldMirrorPlaybackQueueToNative(queue);
                const hasQueuedNext = queue != null && queue.index + 1 < queue.items.length;

                // Music opts out of the native mirror (see
                // `shouldMirrorPlaybackQueueToNative`); when JS owns the
                // within-queue advance and we have a next track, drive it
                // here. Native still fires SamoAudioNavigationRequest as a
                // backup but the 'ended' event arrives sooner, so handling
                // here cuts the song-to-song gap noticeably.
                if (
                    !nativeOwnsFileAdvance &&
                    hasQueuedNext &&
                    snapshot.item.source === 'music'
                ) {
                    void advanceQueue();
                } else if (!hasQueuedNext &&
                    (snapshot.item.source === 'audiobook' ||
                        snapshot.item.source === 'podcast')
                ) {
                    // End of the queue on a long-form item: step to the next
                    // episode/chapter beyond the queue via the registered
                    // handler. Within-queue advancement for the long-form
                    // sources is owned natively (SamoAudioEngine.requestQueueAdvanceFromEnded).
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
                    setTimeout(() => {
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

        return () => subscription.remove();
    }, [
        advanceQueue,
        playQueuedItem,
        serverConnections,
        shouldAcceptPlaybackEvent,
        syncPlaybackFromNativeEvent,
    ]);

    useEffect(() => {
        const subscription = subscribeToAndroidNavigationRequests((event) => {
            const direction = event.direction === -1 ? -1 : 1;
            // Native (SamoAudioEngine.tryNavigateNativeQueue) already tried to
            // step within the mirrored queue before emitting this event. But
            // music currently opts out of the mirror (see
            // `shouldMirrorPlaybackQueueToNative`), so for music the within-queue
            // advance is JS's job — handle it here before falling through to
            // `navigateRef.current?.(direction)`, which is the "jump out of the
            // current queue" path (next episode, next chapter, etc.).
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

    useEffect(() => {
        if (playbackStatus === 'idle' || !isAndroidNativePlaybackAvailable()) {
            return;
        }

        // Position-ticker only — keeps the seek bar advancing in the UI when
        // the engine isn't emitting a state event. Progress sync writes are
        // now owned by the foreground service (SamoProgressSync.kt), so this
        // poll no longer needs to be alive in the background or at high
        // frequency just to land the next server PATCH.
        const intervalMs = isFullPlayerOpen ? 1000 : 2000;
        const interval = setInterval(() => {
            void getAndroidPlaybackStatus()
                .then((event) => {
                    const snapshot = playbackSnapshotRef.current;

                    if (!shouldAcceptPlaybackEvent(event, snapshot) || !snapshot) {
                        return;
                    }

                    setAndroidPlaybackState((current) =>
                        reducePlaybackStateFromEvent(current, event, playbackSnapshotRef.current, {
                            minPositionDeltaMs: 250,
                            preserveMessage: true,
                        }),
                    );
                })
                .catch(() => undefined);
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isFullPlayerOpen, playbackStatus, shouldAcceptPlaybackEvent]);

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
        playQueuedItem,
        registerNavigatePlayback,
    };
}

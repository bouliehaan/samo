import {
    findServerAuthenticationForSource,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';
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
import {
    syncAbsProgressThrottled,
} from '../services/abs-progress';
import {
    resolveSamoMusicPlaybackContext,
    syncSamoMusicPlaybackStarted,
    syncSamoMusicPlaybackSubmission,
    syncSamoMusicPlaybackThrottled,
    syncSamoPlaylistPlaybackStarted,
    syncSamoPlaylistPlaybackSubmission,
    type SamoPlaylistPlaybackContext,
} from '../services/samo-playback-sync';
import {
    buildAbsProgressContextFromPlayable,
    getAbsProgressSeconds,
} from '../utils/abs-progress-math';
import { useAppSessionState } from '../state/app-session';
import {
    type AndroidPlaybackQueue,
    getPlaybackQueue,
    setPlaybackQueue,
} from '../state/playback-queue-store';
import {
    getAndroidPlaybackState,
    selectActiveAndroidPlaybackItem,
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
    resolvePlaybackProgressFromEvent,
} from '../utils/playback-time';
import { androidLog } from '../utils/log';
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

const resolveSamoPlaylistPlaybackContext = (
    queue: AndroidPlaybackQueue | null,
    item: MobilePlayableAudio,
    serverConnections: ServerAuthenticationResult[],
): SamoPlaylistPlaybackContext | null => {
    if (!queue?.samoPlaylistId || item.source !== 'music') {
        return null;
    }

    const authentication = findServerAuthenticationForSource(serverConnections, {
        id: item.contentSourceId,
    });
    if (!authentication || authentication.type !== ServerType.SAMO) {
        return null;
    }

    return { authentication, playlistId: queue.samoPlaylistId };
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
    const samoPlaybackStartedSessionRef = useRef<string | undefined>(undefined);
    const samoScrobbledSessionRef = useRef<string | undefined>(undefined);
    const samoPlaylistPlaybackStartedRef = useRef<string | undefined>(undefined);
    const samoPlaylistScrobbledSessionRef = useRef<string | undefined>(undefined);

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
                positionMs: initialPositionMs,
                sessionId: session.id,
                status: 'loading',
            });

            const nativeQueue =
                itemToPlay.source !== 'radio' &&
                shouldMirrorPlaybackQueueToNative({ items: queueItemsForSession })
                    ? { index: nextQueueIndex, items: queueItemsForSession }
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

                setAndroidPlaybackState({
                    bitPerfect: event.bitPerfect,
                    deviceInfo,
                    durationMs: getPlaybackEventDurationMs(event, nativeItem),
                    item: nativeItem,
                    message: event.message,
                    positionMs: event.positionMs ?? initialPositionMs,
                    sessionId: session.id,
                    status: getActivePlaybackStatus(event.status, 'buffering'),
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
        if (!getPlaybackQueue()) {
            return;
        }

        try {
            const event = await getAndroidPlaybackStatus();
            syncPlaybackFromNativeEvent(event);

            if (event.status !== 'ended') {
                return;
            }

            const queue = getPlaybackQueue();
            if (
                queue &&
                queue.index + 1 < queue.items.length &&
                !shouldMirrorPlaybackQueueToNative(queue)
            ) {
                await advanceQueue();
            }
        } catch {
            // Best-effort when returning from background.
        }
    }, [advanceQueue, syncPlaybackFromNativeEvent]);

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

            const samoCtx = resolveSamoMusicPlaybackContext(snapshot.item, serverConnections);
            const samoProgressSeconds = Math.max(0, Math.floor((event.positionMs ?? 0) / 1000));
            const samoMusicWriteOptions = {
                touchLastPlayedAt: !getPlaybackQueue()?.omitTrackRecentlyPlayed,
            };

            if (samoCtx && event.status === 'playing') {
                if (samoPlaybackStartedSessionRef.current !== snapshot.sessionId) {
                    samoPlaybackStartedSessionRef.current = snapshot.sessionId;
                    void syncSamoMusicPlaybackStarted(
                        samoCtx,
                        samoProgressSeconds,
                        samoMusicWriteOptions,
                    );
                }
            }

            const samoPlaylistCtx = resolveSamoPlaylistPlaybackContext(
                getPlaybackQueue(),
                snapshot.item,
                serverConnections,
            );
            if (samoPlaylistCtx && event.status === 'playing') {
                const playlistSessionKey = `${samoPlaylistCtx.playlistId}:${snapshot.sessionId}`;
                if (samoPlaylistPlaybackStartedRef.current !== playlistSessionKey) {
                    samoPlaylistPlaybackStartedRef.current = playlistSessionKey;
                    void syncSamoPlaylistPlaybackStarted(samoPlaylistCtx);
                }
            }

            if (samoCtx && event.status === 'ended') {
                if (samoScrobbledSessionRef.current !== snapshot.sessionId) {
                    samoScrobbledSessionRef.current = snapshot.sessionId;
                    const durationSeconds = snapshot.item.durationSeconds ?? 0;
                    void syncSamoMusicPlaybackSubmission(
                        samoCtx,
                        durationSeconds > 0 ? durationSeconds : samoProgressSeconds,
                        samoMusicWriteOptions,
                    );
                }
            }

            if (samoPlaylistCtx && event.status === 'ended') {
                if (samoPlaylistScrobbledSessionRef.current !== snapshot.sessionId) {
                    samoPlaylistScrobbledSessionRef.current = snapshot.sessionId;
                    void syncSamoPlaylistPlaybackSubmission(samoPlaylistCtx);
                }
            }

            if (event.status === 'ended') {
                const queue = getPlaybackQueue();
                const nativeOwnsFileAdvance =
                    queue != null && shouldMirrorPlaybackQueueToNative(queue);
                const hasQueuedNext = queue != null && queue.index + 1 < queue.items.length;

                if (
                    !nativeOwnsFileAdvance &&
                    !hasQueuedNext &&
                    (snapshot.item.source === 'audiobook' ||
                        snapshot.item.source === 'podcast')
                ) {
                    void navigateRef.current?.(1);
                }
            }

            if (event.status === 'error') {
                const absCtx = absContextRef.current;
                const playbackState = getAndroidPlaybackState();
                const positionMs =
                    playbackState.status !== 'idle' ? playbackState.positionMs : undefined;

                if (
                    absCtx &&
                    playbackState.status !== 'idle' &&
                    (positionMs ?? 0) > 0
                ) {
                    void syncAbsProgressThrottled(
                        absCtx,
                        getAbsProgressSeconds(absCtx, positionMs, playbackState.item),
                    );
                }

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
        playQueuedItem,
        serverConnections,
        shouldAcceptPlaybackEvent,
        syncPlaybackFromNativeEvent,
    ]);

    useEffect(() => {
        const subscription = subscribeToAndroidNavigationRequests((event) => {
            const direction = event.direction === -1 ? -1 : 1;
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

        const intervalMs = isFullPlayerOpen ? 1000 : absContextRef.current ? 3000 : 2000;
        const interval = setInterval(() => {
            void getAndroidPlaybackStatus()
                .then((event) => {
                    const snapshot = playbackSnapshotRef.current;

                    if (!shouldAcceptPlaybackEvent(event, snapshot) || !snapshot) {
                        return;
                    }

                    const positionMs = event.positionMs;
                    const absCtx = absContextRef.current;

                    const activeItem =
                        playbackSnapshotRef.current?.item ??
                        selectActiveAndroidPlaybackItem(getAndroidPlaybackState());
                    if (!activeItem) {
                        return;
                    }

                    if (absCtx && positionMs && event.status === 'playing') {
                        void syncAbsProgressThrottled(
                            absCtx,
                            getAbsProgressSeconds(absCtx, positionMs, activeItem),
                        );
                    }

                    const samoCtx = resolveSamoMusicPlaybackContext(
                        activeItem,
                        serverConnections,
                    );
                    if (samoCtx && positionMs && event.status === 'playing') {
                        void syncSamoMusicPlaybackThrottled(
                            samoCtx,
                            Math.floor(positionMs / 1000),
                            {
                                touchLastPlayedAt:
                                    !getPlaybackQueue()?.omitTrackRecentlyPlayed,
                            },
                        );
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
    }, [isFullPlayerOpen, playbackStatus, serverConnections, shouldAcceptPlaybackEvent]);

    useEffect(() => {
        setDownloadsPlaybackActive(playbackStatus !== 'idle');
    }, [playbackStatus]);

    useEffect(() => {
        void hydrateNativePlaybackState();
    }, [hydrateNativePlaybackState]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
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

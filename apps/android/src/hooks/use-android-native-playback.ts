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
import { getAbsProgressSeconds } from '../utils/abs-progress-math';
import { useAppSessionState } from '../state/app-session';
import {
    getAndroidPlaybackState,
    selectActiveAndroidPlaybackItem,
    selectAndroidPlaybackStatus,
    setAndroidPlaybackState,
    useAndroidPlaybackState,
} from '../state/playback-store';
import { buildRecoveredPlaybackItem } from '../utils/playback-recovery';
import {
    getResumePositionSeconds,
    refreshPlayableResumeFromServer,
    shouldAutoRecoverPlayback,
    withResumePosition,
} from '../utils/playback-resume';
import { preparePlaybackItemForNative } from '../utils/samo-artwork-url';
import { resolveLocalPlayback } from '../utils/offline-playback';
import {
    getActivePlaybackStatus,
    getPlaybackEventDurationMs,
    getPlaybackItemDurationMs,
    resolvePlaybackProgressFromEvent,
} from '../utils/playback-time';
import { androidLog } from '../utils/log';
import { setDownloadsPlaybackActive } from '../services/download-manager';

export type AndroidPlaybackQueue = {
    index: number;
    items: MobilePlayableAudio[];
    /** Playlist queue: do not mark individual tracks as recently played on the server. */
    omitTrackRecentlyPlayed?: boolean;
    samoPlaylistId?: string;
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
    playbackQueueRef: MutableRefObject<AndroidPlaybackQueue | null>;
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
    const {
        castState,
        forcePlaybackQueueRender,
        setIsShuffled,
    } = useAppSessionState();

    const playbackStatus = useAndroidPlaybackState(selectAndroidPlaybackStatus);
    const absContextRef = useRef<AbsProgressContext | null>(null);
    const playbackQueueRef = useRef<AndroidPlaybackQueue | null>(null);
    const playbackSequenceRef = useRef(0);
    const playbackRecoveryAttemptRef = useRef(0);
    const playbackStartedAtRef = useRef(0);
    const playbackSnapshotRef = useRef<null | { item: MobilePlayableAudio; sessionId: string }>(
        null,
    );
    const samoPlaybackStartedSessionRef = useRef<string | undefined>(undefined);
    const samoScrobbledSessionRef = useRef<string | undefined>(undefined);
    const samoPlaylistPlaybackStartedRef = useRef<string | undefined>(undefined);
    const samoPlaylistScrobbledSessionRef = useRef<string | undefined>(undefined);

    const shouldAcceptPlaybackEvent = useCallback(
        (
            event: Pick<AndroidNativePlaybackEvent, 'sessionId' | 'source' | 'status'>,
            snapshot: { sessionId: string } | null,
        ) => {
            if (!snapshot) {
                return false;
            }
            if (event.status === 'ended') {
                return !event.sessionId || event.sessionId === snapshot.sessionId;
            }
            if (!event.sessionId) {
                return true;
            }
            if (event.sessionId === snapshot.sessionId) {
                return true;
            }
            // Native auto-advanced while JS was suspended (screen off / background).
            const queue = playbackQueueRef.current;
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
            const queue = playbackQueueRef.current;
            if (!queue) {
                return;
            }

            if (event.queueIndex != null && event.queueIndex >= 0 && event.queueIndex !== queue.index) {
                playbackQueueRef.current = {
                    ...queue,
                    index: event.queueIndex,
                };
                forcePlaybackQueueRender();
            }

            const sourceId = event.source?.id;
            if (!sourceId || !event.sessionId) {
                return;
            }

            const nextIndex = queue.items.findIndex((item) => item.id === sourceId);
            if (nextIndex < 0) {
                return;
            }

            if (nextIndex !== playbackQueueRef.current?.index) {
                playbackQueueRef.current = {
                    ...queue,
                    index: nextIndex,
                };
                forcePlaybackQueueRender();
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
        [forcePlaybackQueueRender],
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
                        playbackQueueRef.current?.items.some(
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

            playbackQueueRef.current = {
                index: nextQueueIndex,
                items: queueItemsForSession,
                omitTrackRecentlyPlayed: playOptions?.omitTrackRecentlyPlayed,
                samoPlaylistId: playOptions?.samoPlaylistId,
            };
            forcePlaybackQueueRender();
            syncAndroidNativePlaybackQueue(playbackQueueRef.current, serverConnections);
            playbackSnapshotRef.current = { item: nativeItem, sessionId: session.id };
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

                if (initialPositionMs > 0) {
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
                            const queue = playbackQueueRef.current;
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
                            playbackQueueRef.current = {
                                ...queue,
                                items: queue.items.map((queueItem, index) =>
                                    index === upcomingIndex ? preparedUpcoming : queueItem,
                                ),
                            };
                            forcePlaybackQueueRender();
                            syncAndroidNativePlaybackQueue(playbackQueueRef.current, serverConnections);
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
        [
            castState.isConnected,
            forcePlaybackQueueRender,
            serverConnections,
            setIsShuffled,
        ],
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
        const queue = playbackQueueRef.current;
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
        if (!playbackQueueRef.current) {
            return;
        }

        try {
            const event = await getAndroidPlaybackStatus();
            syncPlaybackFromNativeEvent(event);

            if (event.status !== 'ended') {
                return;
            }

            const queue = playbackQueueRef.current;
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
                touchLastPlayedAt: !playbackQueueRef.current?.omitTrackRecentlyPlayed,
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
                playbackQueueRef.current,
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
                const queue = playbackQueueRef.current;
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
                            playbackQueueRef.current?.items,
                            playbackQueueRef.current?.index,
                        );
                    }, 1500);
                    return;
                }
            }

            setAndroidPlaybackState((current) => {
                if (current.status === 'idle') {
                    return current;
                }

                const activeItem =
                    playbackSnapshotRef.current?.item ??
                    current.item;
                const activeSessionId =
                    event.sessionId ??
                    playbackSnapshotRef.current?.sessionId ??
                    current.sessionId;

                const progress = resolvePlaybackProgressFromEvent(event, current, activeItem);

                return {
                    ...current,
                    bitPerfect: event.bitPerfect ?? current.bitPerfect,
                    durationMs: progress.durationMs,
                    item: activeItem,
                    message: event.message,
                    positionMs: progress.positionMs,
                    sessionId: activeSessionId,
                    status: getActivePlaybackStatus(event.status, current.status),
                };
            });
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
                const queue = playbackQueueRef.current;
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
                                    !playbackQueueRef.current?.omitTrackRecentlyPlayed,
                            },
                        );
                    }

                    setAndroidPlaybackState((current) => {
                        if (current.status === 'idle') {
                            return current;
                        }

                        const activeItem =
                            playbackSnapshotRef.current?.item ?? current.item;
                        const progress = resolvePlaybackProgressFromEvent(event, current, activeItem);
                        const nextPositionMs = progress.positionMs;
                        const nextStatus = getActivePlaybackStatus(event.status, current.status);
                        const nextDurationMs = progress.durationMs;
                        const nextMessage = event.message ?? current.message;
                        const nextBitPerfect = event.bitPerfect ?? current.bitPerfect;

                        if (
                            nextStatus === current.status &&
                            activeItem.id === current.item.id &&
                            nextDurationMs === current.durationMs &&
                            nextMessage === current.message &&
                            nextBitPerfect === current.bitPerfect &&
                            Math.abs((nextPositionMs ?? 0) - (current.positionMs ?? 0)) < 250
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
                            status: nextStatus,
                        };
                    });
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
        playbackQueueRef,
        playbackSnapshotRef,
        playQueuedItem,
        registerNavigatePlayback,
    };
}

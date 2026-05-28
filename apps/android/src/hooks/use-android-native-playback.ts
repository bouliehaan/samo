import { type ServerAuthenticationResult } from '@samo/core/server';
import type { MobilePlayableAudio } from '@samo/core/mobile';
import { createPlaybackSession } from '@samo/core/playback';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { AppState } from 'react-native';

import {
    getAndroidAudioDeviceInfo,
    getAndroidPlaybackStatus,
    isAndroidNativePlaybackAvailable,
    playAndroidAudio,
    seekAndroidAudio,
    subscribeToAndroidAudioEvents,
    subscribeToAndroidNavigationRequests,
} from '../services/audio-playback';
import type { AbsProgressContext } from '../services/abs-progress';
import {
    syncAbsProgressImmediate,
    syncAbsProgressThrottled,
} from '../services/abs-progress';
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
    shouldAutoRecoverPlayback,
    withResumePosition,
} from '../utils/playback-resume';
import { preparePlaybackItemForNative } from '../utils/samo-artwork-url';
import { resolveLocalPlayback } from '../utils/offline-playback';
import {
    getActivePlaybackStatus,
    getPlaybackEventDurationMs,
    getPlaybackItemDurationMs,
    getStablePlaybackPositionMs,
} from '../utils/playback-time';
import { setDownloadsPlaybackActive } from '../services/download-manager';

export interface AndroidNativePlaybackController {
    absContextRef: MutableRefObject<AbsProgressContext | null>;
    handlePlayItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: { shuffled?: boolean },
    ) => Promise<void>;
    hydrateNativePlaybackState: () => Promise<void>;
    playbackQueueRef: MutableRefObject<null | { index: number; items: MobilePlayableAudio[] }>;
    playbackSnapshotRef: MutableRefObject<null | {
        item: MobilePlayableAudio;
        sessionId: string;
    }>;
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: { shuffled?: boolean },
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
    const playbackQueueRef = useRef<null | { index: number; items: MobilePlayableAudio[] }>(null);
    const playbackSequenceRef = useRef(0);
    const playbackRecoveryAttemptRef = useRef(0);
    const playbackStartedAtRef = useRef(0);
    const playbackSnapshotRef = useRef<null | { item: MobilePlayableAudio; sessionId: string }>(
        null,
    );
    const navigateRef = useRef<((direction: -1 | 1) => Promise<void>) | null>(null);

    const hydrateNativePlaybackState = useCallback(async () => {
        if (!isAndroidNativePlaybackAvailable()) {
            return;
        }

        try {
            const event = await getAndroidPlaybackStatus();
            if (event.status === 'idle') {
                return;
            }

            const currentPlaybackState = getAndroidPlaybackState();
            if (currentPlaybackState.status !== 'idle') {
                if (!event.sessionId || event.sessionId !== currentPlaybackState.sessionId) {
                    return;
                }
            }

            const item =
                currentPlaybackState.status !== 'idle'
                    ? currentPlaybackState.item
                    : buildRecoveredPlaybackItem(
                          event,
                          playbackSnapshotRef.current?.item ?? lastPlayedItem,
                      );
            if (!item) {
                return;
            }

            const sessionId =
                currentPlaybackState.status !== 'idle'
                    ? currentPlaybackState.sessionId
                    : (event.sessionId ?? `recovered:${item.id}`);
            playbackSnapshotRef.current = { item, sessionId };
            setAndroidPlaybackState((current) => {
                if (current.status !== 'idle' && current.sessionId !== sessionId) {
                    return current;
                }

                const activeItem =
                    current.status !== 'idle' && current.sessionId === sessionId
                        ? current.item
                        : item;

                return {
                    bitPerfect:
                        event.bitPerfect ??
                        (current.status === 'idle' ? undefined : current.bitPerfect),
                    durationMs: getPlaybackEventDurationMs(event, activeItem),
                    item: activeItem,
                    message:
                        event.message ?? (current.status === 'idle' ? undefined : current.message),
                    positionMs:
                        current.status === 'idle'
                            ? event.positionMs
                            : getStablePlaybackPositionMs(event, current),
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
    }, [lastPlayedItem]);

    const playQueuedItem = useCallback(
        async (
            item: MobilePlayableAudio,
            queueItems: MobilePlayableAudio[] = [item],
            queueIndex?: number,
            playOptions?: { shuffled?: boolean },
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
            const resumeSeconds = getResumePositionSeconds(item, playbackState);
            const itemToPlay = withResumePosition(item, resumeSeconds);
            const initialPositionMs =
                resumeSeconds && resumeSeconds > 0 ? resumeSeconds * 1000 : 0;
            const session = createPlaybackSession({
                engine: 'android-native',
                mediaKey: item.id,
                sequence: (playbackSequenceRef.current += 1),
                source: item.source,
            });

            playbackQueueRef.current = {
                index: nextQueueIndex,
                items: playableQueueItems,
            };
            forcePlaybackQueueRender();
            if (playOptions?.shuffled !== undefined) {
                setIsShuffled(playOptions.shuffled);
            }

            const nativeItem = await preparePlaybackItemForNative(itemToPlay, serverConnections);
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

            try {
                const isCurrentPlaybackSession = () =>
                    playbackSnapshotRef.current?.sessionId === session.id;
                const deviceInfoPromise = getAndroidAudioDeviceInfo().catch(() => undefined);
                const playable = castState.isConnected
                    ? nativeItem
                    : await resolveLocalPlayback(nativeItem);
                if (!isCurrentPlaybackSession()) return;
                let event = await playAndroidAudio(playable, session.id, nativeItem);
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
        [castState.isConnected, forcePlaybackQueueRender, serverConnections, setIsShuffled],
    );

    const handlePlayItem = useCallback(
        async (
            item: MobilePlayableAudio,
            queueItems: MobilePlayableAudio[] = [item],
            queueIndex?: number,
            playOptions?: { shuffled?: boolean },
        ) => {
            await playQueuedItem(item, queueItems, queueIndex, playOptions);
        },
        [playQueuedItem],
    );

    useEffect(() => {
        const subscription = subscribeToAndroidAudioEvents((event) => {
            const snapshot = playbackSnapshotRef.current;

            if (!snapshot || (event.sessionId && event.sessionId !== snapshot.sessionId)) {
                return;
            }

            if (event.status === 'playing') {
                playbackRecoveryAttemptRef.current = 0;
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
                    void syncAbsProgressImmediate(
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

            if (event.status === 'ended') {
                const playbackState = getAndroidPlaybackState();
                const absCtx = absContextRef.current;

                if (absCtx && playbackState.status !== 'idle') {
                    void syncAbsProgressImmediate(
                        absCtx,
                        getAbsProgressSeconds(absCtx, event.positionMs, playbackState.item),
                    );
                }

                const queue = playbackQueueRef.current;
                const nextIndex = queue ? queue.index + 1 : -1;
                const nextItem = queue?.items[nextIndex];

                if (nextItem && queue) {
                    void playQueuedItem(nextItem, queue.items, nextIndex);
                    return;
                }
            }

            setAndroidPlaybackState((current) => {
                if (current.status === 'idle') {
                    return current;
                }

                return {
                    ...current,
                    bitPerfect: event.bitPerfect ?? current.bitPerfect,
                    durationMs: getPlaybackEventDurationMs(event, current.item),
                    message: event.message,
                    positionMs: getStablePlaybackPositionMs(event, current),
                    status: getActivePlaybackStatus(event.status, current.status),
                };
            });
        });

        return () => subscription.remove();
    }, [playQueuedItem]);

    useEffect(() => {
        const subscription = subscribeToAndroidNavigationRequests((event) => {
            const direction = event.direction === -1 ? -1 : 1;
            void navigateRef.current?.(direction);
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (playbackStatus === 'idle' || !isAndroidNativePlaybackAvailable()) {
            return;
        }

        const intervalMs = isFullPlayerOpen ? 1000 : absContextRef.current ? 3000 : 8000;
        const interval = setInterval(() => {
            void getAndroidPlaybackStatus()
                .then((event) => {
                    const snapshot = playbackSnapshotRef.current;

                    if (!snapshot || (event.sessionId && event.sessionId !== snapshot.sessionId)) {
                        return;
                    }

                    const positionMs = event.positionMs;
                    const absCtx = absContextRef.current;

                    if (absCtx && positionMs && event.status === 'playing') {
                        const activeItem =
                            playbackSnapshotRef.current?.item ??
                            selectActiveAndroidPlaybackItem(getAndroidPlaybackState());
                        if (!activeItem) {
                            return;
                        }
                        void syncAbsProgressThrottled(
                            absCtx,
                            getAbsProgressSeconds(absCtx, positionMs, activeItem),
                        );
                    }

                    setAndroidPlaybackState((current) => {
                        if (current.status === 'idle') {
                            return current;
                        }

                        const nextPositionMs = getStablePlaybackPositionMs(event, current);
                        const nextStatus = getActivePlaybackStatus(event.status, current.status);
                        const nextDurationMs = getPlaybackEventDurationMs(event, current.item);
                        const nextMessage = event.message ?? current.message;
                        const nextBitPerfect = event.bitPerfect ?? current.bitPerfect;

                        if (
                            nextStatus === current.status &&
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
                            message: nextMessage,
                            positionMs: nextPositionMs,
                            status: nextStatus,
                        };
                    });
                })
                .catch(() => undefined);
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isFullPlayerOpen, playbackStatus]);

    useEffect(() => {
        setDownloadsPlaybackActive(playbackStatus !== 'idle');
    }, [playbackStatus]);

    useEffect(() => {
        void hydrateNativePlaybackState();
    }, [hydrateNativePlaybackState]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                void hydrateNativePlaybackState();
            }
        });

        return () => subscription.remove();
    }, [hydrateNativePlaybackState]);

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

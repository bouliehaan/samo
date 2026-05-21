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
}): AndroidNativePlaybackController {
    const { isFullPlayerOpen, lastPlayedItem } = options;
    const {
        castState,
        forcePlaybackQueueRender,
        setIsShuffled,
    } = useAppSessionState();

    const playbackStatus = useAndroidPlaybackState(selectAndroidPlaybackStatus);
    const absContextRef = useRef<AbsProgressContext | null>(null);
    const playbackQueueRef = useRef<null | { index: number; items: MobilePlayableAudio[] }>(null);
    const playbackSequenceRef = useRef(0);
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
                    : buildRecoveredPlaybackItem(event, lastPlayedItem);
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
            const initialPositionMs =
                item.initialPositionSeconds && item.initialPositionSeconds > 0
                    ? item.initialPositionSeconds * 1000
                    : 0;
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
            playbackSnapshotRef.current = { item, sessionId: session.id };
            setAndroidPlaybackState({
                durationMs: getPlaybackItemDurationMs(item),
                item,
                positionMs: initialPositionMs,
                sessionId: session.id,
                status: 'loading',
            });

            try {
                const isCurrentPlaybackSession = () =>
                    playbackSnapshotRef.current?.sessionId === session.id;
                const deviceInfoPromise = getAndroidAudioDeviceInfo().catch(() => undefined);
                const playable = castState.isConnected ? item : await resolveLocalPlayback(item);
                if (!isCurrentPlaybackSession()) return;
                let event = await playAndroidAudio(playable, session.id, item);
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
                    durationMs: getPlaybackEventDurationMs(event, item),
                    item,
                    message: event.message,
                    positionMs: event.positionMs ?? initialPositionMs,
                    sessionId: session.id,
                    status: getActivePlaybackStatus(event.status, 'buffering'),
                });
            } catch (error) {
                if (playbackSnapshotRef.current?.sessionId !== session.id) return;
                setAndroidPlaybackState({
                    durationMs: getPlaybackItemDurationMs(item),
                    item,
                    message: error instanceof Error ? error.message : 'Playback failed',
                    positionMs: initialPositionMs,
                    sessionId: session.id,
                    status: 'error',
                });
            }
        },
        [castState.isConnected, forcePlaybackQueueRender, setIsShuffled],
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

            setAndroidPlaybackState((current) => {
                if (current.status === 'idle') {
                    return current;
                }

                if (event.status === 'ended') {
                    const absCtx = absContextRef.current;
                    if (absCtx) {
                        void syncAbsProgressImmediate(
                            absCtx,
                            getAbsProgressSeconds(absCtx, event.positionMs, current.item),
                        );
                    }
                    const queue = playbackQueueRef.current;
                    const nextIndex = queue ? queue.index + 1 : -1;
                    const nextItem = queue?.items[nextIndex];

                    if (nextItem) {
                        void playQueuedItem(nextItem, queue.items, nextIndex);
                        return current;
                    }
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

        const intervalMs = isFullPlayerOpen ? 1000 : 5000;
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
                            Math.abs((nextPositionMs ?? 0) - (current.positionMs ?? 0)) < 50
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

import type { MobilePlayableAudio } from '@samo/core/mobile';

import type {
    AndroidPlaybackQueue,
    AndroidPlayItemOptions,
} from './use-android-native-playback';
import type { ServerAuthenticationResult } from '@samo/core/server';
import { useCallback, useRef, type MutableRefObject } from 'react';

import type { AbsProgressContext } from '../services/abs-progress';
import { syncAbsProgressImmediate } from '../services/abs-progress';
import {
    resolveSamoMusicPlaybackContext,
    syncSamoMusicPlaybackImmediate,
} from '../services/samo-playback-sync';
import {
    getAndroidPlaybackStatus,
    pauseAndroidAudio,
    resumeAndroidAudio,
    seekAndroidAudio,
    syncAndroidNativePlaybackQueue,
} from '../services/audio-playback';
import { useAppSessionState } from '../state/app-session';
import {
    getAndroidPlaybackState,
    setAndroidPlaybackState,
} from '../state/playback-store';
import { getAbsProgressSeconds } from '../utils/abs-progress-math';
import { clamp } from '../utils/math';
import { resolvePlaybackResumeItem } from '../utils/playback-recovery';
import {
    getResumePositionSeconds,
    refreshPlayableResumeFromServer,
    withResumePosition,
} from '../utils/playback-resume';
import {
    getSamoBookPositionSeconds,
    getSamoMaxFilePositionMs,
    isSamoAudiobookPlayback,
    prepareSamoAudiobookPlaybackAtBookPosition,
    samoAudiobookSeekNeedsStreamRestart,
} from '../utils/samo-audiobook-playback';
import { pickAudiobookQueueIndexForBookTime } from '../utils/offline-playback';
import {
    getActivePlaybackStatus,
    getAdjacentSegmentTargetMs,
    getCurrentTimelineSegmentIndex,
    getPlaybackDurationMs,
    getPlaybackEventDurationMs,
    getTimelinePositionSeconds,
    isLivePlayback,
} from '../utils/playback-time';

export interface AndroidPlaybackControls {
    handleNavigatePlayback: (direction: -1 | 1) => Promise<void>;
    handleSeekPlayback: (positionMs: number) => Promise<void>;
    handleSkipPlayback: (offsetSeconds: number) => Promise<void>;
    handleTogglePlayback: () => Promise<void>;
    handleToggleShuffle: () => void;
}

export function useAndroidPlaybackControls(options: {
    absContextRef: MutableRefObject<AbsProgressContext | null>;
    lastPlayedItem: MobilePlayableAudio | null;
    playbackQueueRef: MutableRefObject<AndroidPlaybackQueue | null>;
    serverConnections: ServerAuthenticationResult[];
    playbackSnapshotRef: MutableRefObject<null | {
        item: MobilePlayableAudio;
        sessionId: string;
    }>;
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        playOptions?: AndroidPlayItemOptions,
    ) => Promise<void>;
}): AndroidPlaybackControls {
    const {
        absContextRef,
        lastPlayedItem,
        playbackQueueRef,
        playbackSnapshotRef,
        playQueuedItem,
        serverConnections,
    } = options;
    const { forcePlaybackQueueRender, setIsShuffled } = useAppSessionState();
    const seekGenerationRef = useRef(0);

    const handleSeekPlayback = useCallback(async (positionMs: number) => {
        const playbackState = getAndroidPlaybackState();

        if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
            return;
        }

        const item = playbackState.item;
        const durationMs = getPlaybackDurationMs(playbackState);
        const maxFilePositionMs = isSamoAudiobookPlayback(item)
            ? getSamoMaxFilePositionMs(item, playbackState.durationMs)
            : durationMs;
        const nextPositionMs = clamp(
            positionMs,
            0,
            maxFilePositionMs ?? durationMs ?? Math.max(0, positionMs),
        );
        const seekGeneration = (seekGenerationRef.current += 1);

        if (
            isSamoAudiobookPlayback(item) &&
            samoAudiobookSeekNeedsStreamRestart(item, nextPositionMs, maxFilePositionMs)
        ) {
            const targetBookSeconds = getSamoBookPositionSeconds(item, nextPositionMs);
            const refreshed = await prepareSamoAudiobookPlaybackAtBookPosition(
                item,
                targetBookSeconds,
                serverConnections,
            );
            await playQueuedItem(refreshed, [refreshed], 0, {
                bookStartSeconds: targetBookSeconds,
            });
            return;
        }

        setAndroidPlaybackState((current) =>
            current.status === 'idle' ? current : { ...current, positionMs: nextPositionMs },
        );

        try {
            const event = await seekAndroidAudio(nextPositionMs);
            if (seekGeneration !== seekGenerationRef.current) {
                return;
            }

            const absCtx = absContextRef.current;
            const item =
                getAndroidPlaybackState().status === 'idle'
                    ? playbackState.item
                    : getAndroidPlaybackState().item;

            if (absCtx) {
                void syncAbsProgressImmediate(
                    absCtx,
                    getAbsProgressSeconds(absCtx, nextPositionMs, item),
                );
            }

            const samoCtx = resolveSamoMusicPlaybackContext(item, serverConnections);
            if (samoCtx) {
                void syncSamoMusicPlaybackImmediate(samoCtx, Math.floor(nextPositionMs / 1000), {
                    touchLastPlayedAt: !playbackQueueRef.current?.omitTrackRecentlyPlayed,
                });
            }

            setAndroidPlaybackState((current) => {
                if (current.status === 'idle' || seekGeneration !== seekGenerationRef.current) {
                    return current;
                }

                const resolvedStatus = getActivePlaybackStatus(event.status, current.status);

                return {
                    ...current,
                    bitPerfect: event.bitPerfect ?? current.bitPerfect,
                    durationMs: getPlaybackEventDurationMs(event, current.item),
                    message: event.message ?? current.message,
                    positionMs: nextPositionMs,
                    status: resolvedStatus === 'ended' ? 'playing' : resolvedStatus,
                };
            });
        } catch (error) {
            if (seekGeneration !== seekGenerationRef.current) {
                return;
            }

            setAndroidPlaybackState((current) => {
                if (current.status === 'idle') {
                    return current;
                }

                return {
                    ...current,
                    message: error instanceof Error ? error.message : 'Seek failed',
                    status: 'error',
                };
            });
        }
    }, [absContextRef, playQueuedItem, serverConnections]);

    const restartPlaybackItem = useCallback(
        async (item: MobilePlayableAudio) => {
            const playbackState = getAndroidPlaybackState();
            const itemWithServerProgress = await refreshPlayableResumeFromServer(
                item,
                serverConnections,
            );
            const itemToPlay = withResumePosition(
                itemWithServerProgress,
                getResumePositionSeconds(itemWithServerProgress, playbackState),
            );
            const queue = playbackQueueRef.current;
            const queueIndex =
                queue?.items.findIndex((candidate) => candidate.id === item.id) ?? -1;

            if (queue && queueIndex >= 0) {
                await playQueuedItem(itemToPlay, queue.items, queueIndex);
                return;
            }

            await playQueuedItem(itemToPlay, [item], 0);
        },
        [playbackQueueRef, playQueuedItem, serverConnections],
    );

    const handleTogglePlayback = useCallback(async () => {
        const playbackState = getAndroidPlaybackState();
        const resumeItem = resolvePlaybackResumeItem(
            playbackState,
            playbackSnapshotRef.current?.item,
            lastPlayedItem,
        );

        if (playbackState.status === 'idle' || playbackState.status === 'error') {
            if (resumeItem) {
                await restartPlaybackItem(resumeItem);
            }
            return;
        }

        try {
            if (playbackState.status === 'playing' || playbackState.status === 'buffering') {
                await pauseAndroidAudio();
                setAndroidPlaybackState({ ...playbackState, status: 'paused' });

                const absCtx = absContextRef.current;

                if (absCtx) {
                    void syncAbsProgressImmediate(
                        absCtx,
                        getAbsProgressSeconds(
                            absCtx,
                            playbackState.positionMs,
                            playbackState.item,
                        ),
                    );
                }

                const samoCtx = resolveSamoMusicPlaybackContext(
                    playbackState.item,
                    serverConnections,
                );
                if (samoCtx && playbackState.positionMs) {
                    void syncSamoMusicPlaybackImmediate(
                        samoCtx,
                        Math.floor(playbackState.positionMs / 1000),
                        {
                            touchLastPlayedAt:
                                !playbackQueueRef.current?.omitTrackRecentlyPlayed,
                        },
                    );
                }

                return;
            }

            if (playbackState.status === 'loading') {
                await restartPlaybackItem(playbackState.item);
                return;
            }

            if (playbackState.status === 'paused') {
                const isLongForm =
                    playbackState.item.source === 'podcast' ||
                    playbackState.item.source === 'audiobook';
                const playheadMs = playbackState.positionMs ?? 0;
                if (isLongForm || playheadMs < 3000) {
                    await restartPlaybackItem(playbackState.item);
                    return;
                }
            }

            if (isLivePlayback(playbackState)) {
                await playQueuedItem(playbackState.item, [playbackState.item], 0, {
                    shuffled: false,
                });
                return;
            }

            const event = await resumeAndroidAudio();
            if (event.status === 'idle') {
                if (resumeItem) {
                    await restartPlaybackItem(resumeItem);
                }
                return;
            }

            setAndroidPlaybackState({
                ...playbackState,
                bitPerfect: event.bitPerfect ?? playbackState.bitPerfect,
                durationMs: getPlaybackEventDurationMs(event, playbackState.item),
                message: event.message ?? playbackState.message,
                positionMs: event.positionMs ?? playbackState.positionMs,
                status: getActivePlaybackStatus(event.status, 'playing'),
            });

            // Native can report idle while JS still shows paused after a failed stream.
            const statusCheck = await getAndroidPlaybackStatus().catch(() => null);
            if (
                statusCheck?.status === 'idle' &&
                (!statusCheck.sessionId ||
                    statusCheck.sessionId === playbackSnapshotRef.current?.sessionId)
            ) {
                if (resumeItem) {
                    await restartPlaybackItem(resumeItem);
                }
            }
        } catch (error) {
            setAndroidPlaybackState({
                ...playbackState,
                message: error instanceof Error ? error.message : 'Playback command failed',
                status: 'error',
            });
        }
    }, [absContextRef, lastPlayedItem, playbackSnapshotRef, restartPlaybackItem, serverConnections]);

    const handleSkipPlayback = useCallback(
        async (offsetSeconds: number) => {
            const playbackState = getAndroidPlaybackState();

            if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
                return;
            }

            const item = playbackState.item;

            if (isSamoAudiobookPlayback(item)) {
                const bookPosition = getTimelinePositionSeconds(
                    item,
                    playbackState.positionMs,
                );
                const targetBook = Math.max(0, bookPosition + offsetSeconds);
                const targetFileMs = Math.max(
                    0,
                    (targetBook - (item.progressOffsetSeconds ?? 0)) * 1000,
                );
                const maxFilePositionMs = getSamoMaxFilePositionMs(
                    item,
                    playbackState.durationMs,
                );

                if (
                    samoAudiobookSeekNeedsStreamRestart(
                        item,
                        targetFileMs,
                        maxFilePositionMs,
                    )
                ) {
                    const refreshed = await prepareSamoAudiobookPlaybackAtBookPosition(
                        item,
                        targetBook,
                        serverConnections,
                    );
                    await playQueuedItem(refreshed, [refreshed], 0, {
                        bookStartSeconds: targetBook,
                    });
                    return;
                }
            }

            await handleSeekPlayback((playbackState.positionMs ?? 0) + offsetSeconds * 1000);
        },
        [handleSeekPlayback, playQueuedItem, serverConnections],
    );

    const handleToggleShuffle = useCallback(() => {
        setIsShuffled((current) => {
            const next = !current;
            const queue = playbackQueueRef.current;

            if (next && queue) {
                const before = queue.items.slice(0, queue.index + 1);
                const after = [...queue.items.slice(queue.index + 1)];
                for (let i = after.length - 1; i > 0; i -= 1) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [after[i], after[j]] = [after[j], after[i]];
                }
                playbackQueueRef.current = {
                    ...queue,
                    items: [...before, ...after],
                };
                forcePlaybackQueueRender();
                syncAndroidNativePlaybackQueue(playbackQueueRef.current, serverConnections);
            }

            return next;
        });
    }, [forcePlaybackQueueRender, playbackQueueRef, serverConnections, setIsShuffled]);

    const handleNavigatePlayback = useCallback(
        async (direction: -1 | 1) => {
            const playbackState = getAndroidPlaybackState();
            if (playbackState.status !== 'idle') {
                const segmentTargetMs = getAdjacentSegmentTargetMs(
                    playbackState.item.timelineSegments,
                    playbackState.positionMs ?? 0,
                    direction,
                    playbackState.item,
                );

                if (segmentTargetMs !== undefined) {
                    const queue = playbackQueueRef.current;
                    if (
                        queue &&
                        queue.items.length > 1 &&
                        playbackState.item.source === 'audiobook'
                    ) {
                        const segments = playbackState.item.timelineSegments ?? [];
                        const ordered = [...segments].sort(
                            (left, right) => left.startSeconds - right.startSeconds,
                        );
                        const bookPosition = getTimelinePositionSeconds(
                            playbackState.item,
                            playbackState.positionMs,
                        );
                        const currentIndex = getCurrentTimelineSegmentIndex(
                            ordered,
                            bookPosition,
                        );
                        let bookStart = 0;

                        if (direction === 1) {
                            const next = ordered[currentIndex + 1];
                            if (!next) {
                                return;
                            }
                            bookStart = next.startSeconds;
                        } else if (
                            ordered[currentIndex] &&
                            bookPosition - ordered[currentIndex]!.startSeconds > 5
                        ) {
                            bookStart = ordered[currentIndex]!.startSeconds;
                        } else if (currentIndex > 0) {
                            bookStart = ordered[currentIndex - 1]!.startSeconds;
                        }

                        const fileIndex = pickAudiobookQueueIndexForBookTime(
                            queue.items,
                            bookStart,
                        );
                        const fileItem = queue.items[fileIndex];
                        if (!fileItem) {
                            return;
                        }
                        const fileStartSeconds = Math.max(
                            0,
                            bookStart - (fileItem.progressOffsetSeconds ?? 0),
                        );
                        await playQueuedItem(
                            withResumePosition(fileItem, fileStartSeconds),
                            queue.items,
                            fileIndex,
                            { skipResumeRefresh: true },
                        );
                        return;
                    }

                    if (isSamoAudiobookPlayback(playbackState.item)) {
                        const segments = playbackState.item.timelineSegments ?? [];
                        const ordered = [...segments].sort(
                            (left, right) => left.startSeconds - right.startSeconds,
                        );
                        const bookPosition = getTimelinePositionSeconds(
                            playbackState.item,
                            playbackState.positionMs,
                        );
                        const currentIndex = getCurrentTimelineSegmentIndex(
                            ordered,
                            bookPosition,
                        );
                        const currentSegment =
                            currentIndex >= 0 ? ordered[currentIndex] : undefined;
                        let bookStart = 0;

                        if (direction === 1) {
                            const next = ordered[currentIndex + 1];
                            if (!next) {
                                return;
                            }
                            bookStart = next.startSeconds;
                        } else if (
                            currentSegment &&
                            bookPosition - currentSegment.startSeconds > 5
                        ) {
                            bookStart = currentSegment.startSeconds;
                        } else if (currentIndex > 0) {
                            bookStart = ordered[currentIndex - 1]!.startSeconds;
                        }

                        const refreshed = await prepareSamoAudiobookPlaybackAtBookPosition(
                            playbackState.item,
                            bookStart,
                            serverConnections,
                        );
                        await playQueuedItem(refreshed, [refreshed], 0, {
                            bookStartSeconds: bookStart,
                        });
                    } else {
                        await handleSeekPlayback(segmentTargetMs);
                    }
                    return;
                }

                if (direction === -1 && (playbackState.positionMs ?? 0) > 3000) {
                    if (isSamoAudiobookPlayback(playbackState.item)) {
                        const bookPosition = getTimelinePositionSeconds(
                            playbackState.item,
                            playbackState.positionMs,
                        );
                        const targetBook = Math.max(0, bookPosition - 30);
                        const refreshed = await prepareSamoAudiobookPlaybackAtBookPosition(
                            playbackState.item,
                            targetBook,
                            serverConnections,
                        );
                        await playQueuedItem(refreshed, [refreshed], 0, {
                            bookStartSeconds: targetBook,
                        });
                    } else {
                        await handleSeekPlayback(0);
                    }
                    return;
                }
            }

            const queue = playbackQueueRef.current;
            const nextIndex = queue ? queue.index + direction : -1;
            const nextItem = queue?.items[nextIndex];

            if (queue && nextItem) {
                await playQueuedItem(nextItem, queue.items, nextIndex);
            }
        },
        [handleSeekPlayback, playbackQueueRef, playQueuedItem, serverConnections],
    );

    return {
        handleNavigatePlayback,
        handleSeekPlayback,
        handleSkipPlayback,
        handleTogglePlayback,
        handleToggleShuffle,
    };
}

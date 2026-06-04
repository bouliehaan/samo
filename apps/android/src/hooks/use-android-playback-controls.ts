import type { MobilePlayableAudio } from '@samo/core/mobile';

import type { AndroidPlayItemOptions } from './use-android-native-playback';
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
    getPlaybackQueue,
    setPlaybackQueue,
} from '../state/playback-queue-store';
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
    isSamoAudiobookPlayback,
    resolveAudiobookSeekTarget,
} from '../utils/samo-audiobook-playback';
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
        playbackSnapshotRef,
        playQueuedItem,
        serverConnections,
    } = options;
    const { setIsShuffled } = useAppSessionState();
    const seekGenerationRef = useRef(0);

    /**
     * Seek a multi-file Samo audiobook to a book-global position. With whole-file
     * serving this is a LOCAL seek when the target lands in the file already
     * playing, or a queue step (play the target file from its in-file offset)
     * when it crosses a file boundary. Returns true when it handled the seek.
     * No stream restarts — backward seeks always work.
     */
    const seekSamoAudiobookToBookSeconds = useCallback(
        async (targetBookSeconds: number): Promise<boolean> => {
            const queue = getPlaybackQueue();
            if (!queue || queue.items.length === 0) {
                return false;
            }
            const target = resolveAudiobookSeekTarget(queue.items, targetBookSeconds);
            if (target.queueIndex === queue.index) {
                // Same file → local seek to the in-file position.
                await handleSeekPlaybackRef.current?.(target.filePositionMs, {
                    fileLocal: true,
                });
                return true;
            }
            const fileItem = queue.items[target.queueIndex];
            if (!fileItem) {
                return false;
            }
            await playQueuedItem(
                withResumePosition(fileItem, Math.floor(target.filePositionMs / 1000)),
                queue.items,
                target.queueIndex,
                { skipResumeRefresh: true },
            );
            return true;
        },
        [playQueuedItem],
    );

    const handleSeekPlayback = useCallback(async (
        positionMs: number,
        options?: { fileLocal?: boolean },
    ) => {
        const playbackState = getAndroidPlaybackState();

        if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
            return;
        }

        const item = playbackState.item;
        const durationMs = getPlaybackDurationMs(playbackState);

        // For a Samo audiobook the seek bar is book-global. Route it through the
        // queue resolver (unless the caller already mapped it to a file-local
        // position) so it lands in the right file and seeks locally.
        if (
            isSamoAudiobookPlayback(item) &&
            !options?.fileLocal &&
            (getPlaybackQueue()?.items.length ?? 0) > 0
        ) {
            if (await seekSamoAudiobookToBookSeconds(positionMs / 1000)) {
                return;
            }
        }

        // File-local seek (music, podcasts, single-file books, or the resolved
        // in-file target above). Clamp to the native file duration.
        const fileDurationMs =
            isSamoAudiobookPlayback(item) && item.durationSeconds
                ? item.durationSeconds * 1000
                : durationMs;
        const nextPositionMs = clamp(
            positionMs,
            0,
            fileDurationMs ?? durationMs ?? Math.max(0, positionMs),
        );
        const seekGeneration = (seekGenerationRef.current += 1);

        setAndroidPlaybackState((current) =>
            current.status === 'idle' ? current : { ...current, positionMs: nextPositionMs },
        );

        try {
            const event = await seekAndroidAudio(nextPositionMs);
            if (seekGeneration !== seekGenerationRef.current) {
                return;
            }

            const absCtx = absContextRef.current;
            const liveState = getAndroidPlaybackState();
            const item =
                liveState.status === 'idle' ? playbackState.item : liveState.item;

            if (absCtx) {
                void syncAbsProgressImmediate(
                    absCtx,
                    getAbsProgressSeconds(absCtx, nextPositionMs, item),
                );
            }

            const samoCtx = resolveSamoMusicPlaybackContext(item, serverConnections);
            if (samoCtx) {
                void syncSamoMusicPlaybackImmediate(samoCtx, Math.floor(nextPositionMs / 1000), {
                    touchLastPlayedAt: !getPlaybackQueue()?.omitTrackRecentlyPlayed,
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
    }, [absContextRef, seekSamoAudiobookToBookSeconds, serverConnections]);

    // Lets seekSamoAudiobookToBookSeconds call the latest handleSeekPlayback for
    // the file-local leg without a declaration-order or dependency cycle.
    const handleSeekPlaybackRef = useRef(handleSeekPlayback);
    handleSeekPlaybackRef.current = handleSeekPlayback;

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
            const queue = getPlaybackQueue();
            const queueIndex =
                queue?.items.findIndex((candidate) => candidate.id === item.id) ?? -1;

            if (queue && queueIndex >= 0) {
                await playQueuedItem(itemToPlay, queue.items, queueIndex);
                return;
            }

            await playQueuedItem(itemToPlay, [item], 0);
        },
        [playQueuedItem, serverConnections],
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
                                !getPlaybackQueue()?.omitTrackRecentlyPlayed,
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
                const playheadMs = playbackState.positionMs ?? 0;
                // Only the "barely started" case benefits from a clean restart.
                // Long-form (podcast/audiobook) used to ALWAYS restart here, which
                // re-seeded the playhead from stale server progress and threw you
                // back to where the session began (resume a 30-min podcast → jump
                // to ~1:30). A live paused session resumes from the EXACT position
                // via the native resume() path below; if the session was actually
                // lost, that path still detects native idle and falls back to a
                // server-progress restart.
                if (playheadMs < 3000) {
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

            // Samo audiobooks: skip relative to the BOOK position, then resolve
            // through the queue so a -15 that crosses back into the previous file
            // works (it steps the queue and seeks locally — no stream restart).
            if (isSamoAudiobookPlayback(item)) {
                const bookPosition = getTimelinePositionSeconds(item, playbackState.positionMs);
                const targetBook = Math.max(0, bookPosition + offsetSeconds);
                if (await seekSamoAudiobookToBookSeconds(targetBook)) {
                    return;
                }
            }

            await handleSeekPlayback((playbackState.positionMs ?? 0) + offsetSeconds * 1000, {
                fileLocal: true,
            });
        },
        [handleSeekPlayback, seekSamoAudiobookToBookSeconds],
    );

    const handleToggleShuffle = useCallback(() => {
        setIsShuffled((current) => {
            const next = !current;
            const queue = getPlaybackQueue();

            if (next && queue) {
                const before = queue.items.slice(0, queue.index + 1);
                const after = [...queue.items.slice(queue.index + 1)];
                for (let i = after.length - 1; i > 0; i -= 1) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [after[i], after[j]] = [after[j], after[i]];
                }
                setPlaybackQueue({
                    ...queue,
                    items: [...before, ...after],
                });
                syncAndroidNativePlaybackQueue(getPlaybackQueue(), serverConnections);
            }

            return next;
        });
    }, [serverConnections, setIsShuffled]);

    const handleNavigatePlayback = useCallback(
        async (direction: -1 | 1) => {
            const playbackState = getAndroidPlaybackState();
            if (playbackState.status !== 'idle') {
                const item = playbackState.item;
                const segmentTargetMs = getAdjacentSegmentTargetMs(
                    item.timelineSegments,
                    playbackState.positionMs ?? 0,
                    direction,
                    item,
                );

                // Audiobook chapter navigation. Chapters are book-global; with
                // whole-file serving every jump resolves through the queue to a
                // (file, file-position) and seeks locally — Previous reliably
                // steps back into an earlier file with no stream restart.
                if (segmentTargetMs !== undefined) {
                    if (
                        item.source === 'audiobook' &&
                        (getPlaybackQueue()?.items.length ?? 0) > 0
                    ) {
                        const ordered = [...(item.timelineSegments ?? [])].sort(
                            (left, right) => left.startSeconds - right.startSeconds,
                        );
                        const bookPosition = getTimelinePositionSeconds(
                            item,
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
                            // >5s into the chapter → restart the current chapter.
                            bookStart = ordered[currentIndex]!.startSeconds;
                        } else if (currentIndex > 0) {
                            bookStart = ordered[currentIndex - 1]!.startSeconds;
                        }

                        if (await seekSamoAudiobookToBookSeconds(bookStart)) {
                            return;
                        }
                    }

                    await handleSeekPlayback(segmentTargetMs, { fileLocal: true });
                    return;
                }

                // No chapters: Previous past 3s jumps back 30s (book-global) for
                // audiobooks, or to 0 otherwise.
                if (direction === -1 && (playbackState.positionMs ?? 0) > 3000) {
                    if (
                        item.source === 'audiobook' &&
                        (getPlaybackQueue()?.items.length ?? 0) > 0
                    ) {
                        const bookPosition = getTimelinePositionSeconds(
                            item,
                            playbackState.positionMs,
                        );
                        if (await seekSamoAudiobookToBookSeconds(Math.max(0, bookPosition - 30))) {
                            return;
                        }
                    }
                    await handleSeekPlayback(0, { fileLocal: true });
                    return;
                }
            }

            const queue = getPlaybackQueue();
            const nextIndex = queue ? queue.index + direction : -1;
            const nextItem = queue?.items[nextIndex];

            if (queue && nextItem) {
                await playQueuedItem(nextItem, queue.items, nextIndex);
            }
        },
        [handleSeekPlayback, playQueuedItem, seekSamoAudiobookToBookSeconds],
    );

    return {
        handleNavigatePlayback,
        handleSeekPlayback,
        handleSkipPlayback,
        handleTogglePlayback,
        handleToggleShuffle,
    };
}

import type { MobilePlayableAudio } from '@samo/core/mobile';

import type { AndroidPlayItemOptions } from './use-android-native-playback';
import type { ServerAuthenticationResult } from '@samo/core/server';
import { useCallback, useRef, type MutableRefObject } from 'react';

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
import { clamp } from '../utils/math';
import { resolvePlaybackResumeItem } from '../utils/playback-recovery';
import {
    getResumePositionSeconds,
    refreshPlayableResumeFromServerBounded,
    withResumePosition,
} from '../utils/playback-resume';
import {
    isSamoAudiobookPlayback,
    resolveAudiobookSeekTarget,
    shouldServerSeekAudiobookMp3,
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
    lastPlayedItem: MobilePlayableAudio | null;
    serverConnection: ServerAuthenticationResult | null;
    playbackSnapshotRef: MutableRefObject<null | {
        item: MobilePlayableAudio;
        sessionId: string;
    }>;
    /** Native queue step (lock-screen-equivalent); falls back to playQueuedItem when it returns false. */
    playQueueIndexNatively: (targetIndex: number) => Promise<boolean>;
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        playOptions?: AndroidPlayItemOptions,
    ) => Promise<void>;
}): AndroidPlaybackControls {
    const {
        lastPlayedItem,
        playbackSnapshotRef,
        playQueueIndexNatively,
        playQueuedItem,
        serverConnection,
    } = options;
    const { isShuffled, setIsShuffled } = useAppSessionState();
    const seekGenerationRef = useRef(0);

    /**
     * Seek a multi-file Samo audiobook to a book-global position. With whole-file
     * serving this is a LOCAL seek when the target lands in the file already
     * playing, or a queue step (play the target file from its in-file offset)
     * when it crosses a file boundary. Returns true when it handled the seek.
     * No stream restarts — backward seeks always work.
     */
    const seekSamoAudiobookToBookSeconds = useCallback(
        async (targetBookSeconds: number, options?: { isDiscreteSkip?: boolean }): Promise<boolean> => {
            const queue = getPlaybackQueue();
            if (!queue || queue.items.length === 0) {
                return false;
            }
            const target = resolveAudiobookSeekTarget(queue.items, targetBookSeconds);
            const fileItem = queue.items[target.queueIndex];
            if (!fileItem) {
                return false;
            }

            // A long single-file VBR MP3 can't be seeked accurately by the player —
            // its Xing table lands chapter taps 20-70s off, mid-sentence. Reload the
            // stream pre-positioned at the exact second via the server's frame-accurate
            // seek instead of a native seekTo: progressOffsetSeconds becomes the
            // book-time at the stream's start, which preparePlaybackItemForNative encodes
            // into the URL (progressSeconds=) and which makes playQueuedItem skip the
            // player's own broken seek. This also avoids the backward-seek freeze (a
            // fresh range request, no scan). M4B/AAC and multi-file rips are left on the
            // native path — their seeking is already accurate.
            if (shouldServerSeekAudiobookMp3(fileItem)) {
                await playQueuedItem(
                    {
                        ...fileItem,
                        initialPositionSeconds: 0,
                        progressOffsetSeconds: Math.max(0, target.bookPositionSeconds),
                    },
                    queue.items,
                    target.queueIndex,
                    { skipResumeRefresh: true },
                );
                return true;
            }

            if (target.queueIndex === queue.index) {
                // Same file → local seek to the in-file position.
                await handleSeekPlaybackRef.current?.(target.filePositionMs, {
                    fileLocal: true,
                    isDiscreteSkip: options?.isDiscreteSkip,
                });
                return true;
            }

            // To step the queue locally without a stream restart, we update the native
            // queue with the target resume position, then step it natively.
            const updatedQueue = { ...queue };
            updatedQueue.items = [...queue.items];
            updatedQueue.items[target.queueIndex] = withResumePosition(
                fileItem,
                Math.floor(target.filePositionMs / 1000)
            );
            setPlaybackQueue(updatedQueue);
            syncAndroidNativePlaybackQueue(updatedQueue, serverConnection);

            if (await playQueueIndexNatively(target.queueIndex)) {
                return true;
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
        options?: { fileLocal?: boolean; isDiscreteSkip?: boolean },
    ) => {
        const playbackState = getAndroidPlaybackState();

        if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
            return;
        }

        const item = playbackState.item;
        const durationMs = getPlaybackDurationMs(playbackState);

        const isGlobalAudiobookSeek =
            isSamoAudiobookPlayback(item) &&
            !options?.fileLocal &&
            (getPlaybackQueue()?.items.length ?? 0) > 0;

        const fileDurationMs =
            isSamoAudiobookPlayback(item) && item.durationSeconds
                ? item.durationSeconds * 1000
                : durationMs;

        const uiPositionMs = isGlobalAudiobookSeek
            ? clamp(positionMs, 0, durationMs ?? Math.max(0, positionMs))
            : clamp(positionMs, 0, fileDurationMs ?? durationMs ?? Math.max(0, positionMs));

        const seekGeneration = (seekGenerationRef.current += 1);

        // Stamp the pending-seek window so the event reducer (live + poll) holds
        // this target against stale pre-seek echoes from native. Without this,
        // an in-flight echo carrying the OLD position would be adopted as truth,
        // trip the backward-guard against every real post-seek sample, and the
        // bar would get permanently stuck at the pre-seek position.
        const pendingSeekAtMs = Date.now();
        setAndroidPlaybackState((current) =>
            current.status === 'idle'
                ? current
                : {
                      ...current,
                      pendingSeekAtMs,
                      pendingSeekTargetMs: uiPositionMs,
                      positionMs: uiPositionMs,
                  },
        );

        try {
            if (!options?.isDiscreteSkip) {
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
            if (seekGeneration !== seekGenerationRef.current) {
                return;
            }

            // For a Samo audiobook the seek bar is book-global. Route it through the
            // queue resolver so it lands in the right file and seeks locally.
            if (isGlobalAudiobookSeek) {
                if (await seekSamoAudiobookToBookSeconds(positionMs / 1000)) {
                    return;
                }
            }

            const event = await seekAndroidAudio(uiPositionMs);
            if (seekGeneration !== seekGenerationRef.current) {
                return;
            }

            // Kotlin's SamoProgressSync.seekTo → flushNow("seek") captures the
            // post-seek position immediately on the foreground-service side,
            // so we no longer mirror that write from JS.

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
                    // The reducer clears these once a near-target event lands or
                    // the grace expires. Leave them in place here — the seek RPC
                    // resolving does NOT guarantee the event stream has caught up.
                    pendingSeekAtMs: current.pendingSeekAtMs,
                    pendingSeekTargetMs: current.pendingSeekTargetMs,
                    positionMs: uiPositionMs,
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
                    // Seek failed: release the optimistic hold so the bar can
                    // follow whatever position the engine reports next instead
                    // of being pinned to a target we never reached.
                    pendingSeekAtMs: undefined,
                    pendingSeekTargetMs: undefined,
                    status: 'error',
                };
            });
        }
    }, [seekSamoAudiobookToBookSeconds]);

    // Lets seekSamoAudiobookToBookSeconds call the latest handleSeekPlayback for
    // the file-local leg without a declaration-order or dependency cycle.
    const handleSeekPlaybackRef = useRef(handleSeekPlayback);
    handleSeekPlaybackRef.current = handleSeekPlayback;

    const restartPlaybackItem = useCallback(
        async (item: MobilePlayableAudio) => {
            const playbackState = getAndroidPlaybackState();
            // Bounded: a slow server may cost us the cross-device resume
            // overlay, but it must never make the play button look dead.
            const itemWithServerProgress = await refreshPlayableResumeFromServerBounded(
                item,
                serverConnection,
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
        [playQueuedItem, serverConnection],
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

                // Kotlin's Player.Listener.onIsPlayingChanged catches the
                // true→false edge and tells SamoProgressSync to flush the final
                // position, so JS no longer mirrors that write here.

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
    }, [lastPlayedItem, playbackSnapshotRef, restartPlaybackItem]);

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
                if (await seekSamoAudiobookToBookSeconds(targetBook, { isDiscreteSkip: true })) {
                    return;
                }
            }

            await handleSeekPlayback((playbackState.positionMs ?? 0) + offsetSeconds * 1000, {
                fileLocal: true,
                isDiscreteSkip: true,
            });
        },
        [handleSeekPlayback, seekSamoAudiobookToBookSeconds],
    );

    const handleToggleShuffle = useCallback(() => {
        const willShuffle = !isShuffled;

        // Reorder the canonical queue and push it to native OUTSIDE the state
        // updater. Running these external-store writes inside setIsShuffled's
        // reducer fired them mid-render, so the queue sheet's useSyncExternalStore
        // subscription could miss the update — the playback order shuffled but the
        // visible "Up Next" list never followed it.
        if (willShuffle) {
            const queue = getPlaybackQueue();
            if (queue && queue.items.length > 1) {
                const before = queue.items.slice(0, queue.index + 1);
                const after = queue.items.slice(queue.index + 1);
                for (let i = after.length - 1; i > 0; i -= 1) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [after[i], after[j]] = [after[j], after[i]];
                }
                const reordered = { ...queue, items: [...before, ...after] };
                setPlaybackQueue(reordered);
                syncAndroidNativePlaybackQueue(reordered, serverConnection);
            }
        }

        setIsShuffled(willShuffle);
    }, [isShuffled, serverConnection, setIsShuffled]);

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
                        if (await seekSamoAudiobookToBookSeconds(Math.max(0, bookPosition - 30), { isDiscreteSkip: true })) {
                            return;
                        }
                    }
                    await handleSeekPlayback(0, { fileLocal: true, isDiscreteSkip: true });
                    return;
                }
            }

            const queue = getPlaybackQueue();
            const nextIndex = queue ? queue.index + direction : -1;
            const nextItem = queue?.items[nextIndex];

            if (queue && nextItem) {
                // One Next implementation for every entry point: the native
                // queue step the lock screen already uses — atomic on the
                // loaded playlist, no restart, no new session. The JS restart
                // below is only the fallback for queues native can't drive
                // (cast, radio, un-mirrored).
                if (await playQueueIndexNatively(nextIndex)) {
                    return;
                }
                await playQueuedItem(nextItem, queue.items, nextIndex);
            }
        },
        [
            handleSeekPlayback,
            playQueueIndexNatively,
            playQueuedItem,
            seekSamoAudiobookToBookSeconds,
        ],
    );

    return {
        handleNavigatePlayback,
        handleSeekPlayback,
        handleSkipPlayback,
        handleTogglePlayback,
        handleToggleShuffle,
    };
}

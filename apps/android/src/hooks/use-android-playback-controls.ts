import type { MobilePlayableAudio } from '@samo/core/mobile';
import { useCallback, type MutableRefObject } from 'react';

import type { AbsProgressContext } from '../services/abs-progress';
import { syncAbsProgressImmediate } from '../services/abs-progress';
import {
    getAndroidPlaybackStatus,
    pauseAndroidAudio,
    resumeAndroidAudio,
    seekAndroidAudio,
} from '../services/audio-playback';
import { useAppSessionState } from '../state/app-session';
import {
    getAndroidPlaybackState,
    setAndroidPlaybackState,
} from '../state/playback-store';
import { getAbsProgressSeconds } from '../utils/abs-progress-math';
import { clamp } from '../utils/math';
import { resolvePlaybackResumeItem } from '../utils/playback-recovery';
import { getResumePositionSeconds, withResumePosition } from '../utils/playback-resume';
import {
    getActivePlaybackStatus,
    getAdjacentSegmentTargetMs,
    getPlaybackDurationMs,
    getPlaybackEventDurationMs,
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
    playbackQueueRef: MutableRefObject<null | { index: number; items: MobilePlayableAudio[] }>;
    playbackSnapshotRef: MutableRefObject<null | {
        item: MobilePlayableAudio;
        sessionId: string;
    }>;
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        playOptions?: { shuffled?: boolean },
    ) => Promise<void>;
}): AndroidPlaybackControls {
    const { absContextRef, lastPlayedItem, playbackQueueRef, playbackSnapshotRef, playQueuedItem } =
        options;
    const { forcePlaybackQueueRender, setIsShuffled } = useAppSessionState();

    const handleSeekPlayback = useCallback(async (positionMs: number) => {
        const playbackState = getAndroidPlaybackState();

        if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
            return;
        }

        const durationMs = getPlaybackDurationMs(playbackState);
        const nextPositionMs = clamp(positionMs, 0, durationMs ?? Math.max(0, positionMs));

        setAndroidPlaybackState((current) =>
            current.status === 'idle' ? current : { ...current, positionMs: nextPositionMs },
        );

        try {
            const event = await seekAndroidAudio(nextPositionMs);
            const absCtx = absContextRef.current;

            if (absCtx) {
                void syncAbsProgressImmediate(
                    absCtx,
                    getAbsProgressSeconds(absCtx, nextPositionMs, playbackState.item),
                );
            }

            setAndroidPlaybackState((current) => {
                if (current.status === 'idle') {
                    return current;
                }

                return {
                    ...current,
                    bitPerfect: event.bitPerfect ?? current.bitPerfect,
                    durationMs: getPlaybackEventDurationMs(event, current.item),
                    message: event.message ?? current.message,
                    positionMs: nextPositionMs,
                    status: getActivePlaybackStatus(event.status, current.status),
                };
            });
        } catch (error) {
            setAndroidPlaybackState({
                ...playbackState,
                message: error instanceof Error ? error.message : 'Seek failed',
                status: 'error',
            });
        }
    }, [absContextRef]);

    const restartPlaybackItem = useCallback(
        async (item: MobilePlayableAudio) => {
            const playbackState = getAndroidPlaybackState();
            const itemToPlay = withResumePosition(
                item,
                getResumePositionSeconds(item, playbackState),
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
        [playbackQueueRef, playQueuedItem],
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

                return;
            }

            if (playbackState.status === 'loading') {
                await restartPlaybackItem(playbackState.item);
                return;
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
    }, [absContextRef, lastPlayedItem, playbackSnapshotRef, restartPlaybackItem]);

    const handleSkipPlayback = useCallback(
        async (offsetSeconds: number) => {
            const playbackState = getAndroidPlaybackState();

            if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
                return;
            }

            await handleSeekPlayback((playbackState.positionMs ?? 0) + offsetSeconds * 1000);
        },
        [handleSeekPlayback],
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
                playbackQueueRef.current = { index: queue.index, items: [...before, ...after] };
                forcePlaybackQueueRender();
            }

            return next;
        });
    }, [forcePlaybackQueueRender, playbackQueueRef, setIsShuffled]);

    const handleNavigatePlayback = useCallback(
        async (direction: -1 | 1) => {
            const playbackState = getAndroidPlaybackState();

            if (playbackState.status === 'idle') {
                return;
            }

            const segmentTargetMs = getAdjacentSegmentTargetMs(
                playbackState.item.timelineSegments,
                playbackState.positionMs ?? 0,
                direction,
            );

            if (segmentTargetMs !== undefined) {
                await handleSeekPlayback(segmentTargetMs);
                return;
            }

            if (direction === -1 && (playbackState.positionMs ?? 0) > 3000) {
                await handleSeekPlayback(0);
                return;
            }

            const queue = playbackQueueRef.current;
            const nextIndex = queue ? queue.index + direction : -1;
            const nextItem = queue?.items[nextIndex];

            if (queue && nextItem) {
                await playQueuedItem(nextItem, queue.items, nextIndex);
            }
        },
        [handleSeekPlayback, playbackQueueRef, playQueuedItem],
    );

    return {
        handleNavigatePlayback,
        handleSeekPlayback,
        handleSkipPlayback,
        handleTogglePlayback,
        handleToggleShuffle,
    };
}

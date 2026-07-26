import { type SamoPlaybackTargetKind } from '@samo/core/server';

import { clampPosition } from '/@/renderer/store/audiobook-resume-math';
import { type PlaybackSource, usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { subscribePlayerStatus } from '/@/renderer/store/player.store';
import { enqueueProgressWrite } from '/@/renderer/store/progress-write-queue';
import { LongFormLibraryItem, LongFormPodcastEpisode } from '/@/shared/api/long-form-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';

export const POSITION_PERSIST_DEBOUNCE_S = 10;
export const SERVER_PROGRESS_SYNC_INTERVAL_S = 30;

export interface AbsPlaybackProgressSlice {
    duration: number;
    episode: LongFormPodcastEpisode | null | undefined;
    /**
     * Whether a stream was ever resolved for this session — i.e. whether the
     * position is something the listener actually reached rather than a seed.
     */
    hasStream: boolean;
    item: LongFormLibraryItem | null;
    position: number;
    requiresEpisode: boolean;
    server: null | ServerListItemWithCredential;
    sessionId: null | string;
}

export interface AbsPlaybackSyncHandle {
    bumpPlayRequest: () => number;
    getLastFlushedPosition: () => number;
    isCurrentPlayRequest: (requestId: number) => boolean;
    resetAfterClose: () => void;
    resetProgressSync: (position: number) => void;
    resetSyncWarnings: () => void;
    setLastFlushedPosition: (position: number) => void;
    syncProgress: (options: {
        closeSession?: boolean;
        countListeningTime?: boolean;
        force?: boolean;
        reason: AbsProgressReason;
    }) => void;
}

export type AbsProgressReason = 'close' | 'pause' | 'progress' | 'seek';

export function createAbsPlaybackSyncHandle(
    _logLabel: string,
    getSlice: () => AbsPlaybackProgressSlice,
): AbsPlaybackSyncHandle {
    let lastFlushedPosition = 0;
    let lastServerSyncedPosition = 0;
    let playRequestId = 0;

    const resetProgressSync = (position: number) => {
        lastServerSyncedPosition = position;
    };

    const syncProgress: AbsPlaybackSyncHandle['syncProgress'] = (options) => {
        const { duration, episode, hasStream, item, position, requiresEpisode, server } =
            getSlice();

        if (!item || !server) {
            return;
        }

        if (requiresEpisode && !episode) {
            return;
        }

        // Never report a position nothing ever played FROM. Restoring the last
        // session at launch seeds item + position from local state without
        // opening a stream; the close-flush that fires when the listener then
        // plays something else (owner handoff / release) would PATCH that stale
        // local position over the newer one the server already had from another
        // device — silently rewinding a book you'd advanced on your phone.
        if (!hasStream) {
            return;
        }

        const currentTime = clampPosition(position, duration);
        const drift = Math.abs(currentTime - lastServerSyncedPosition);
        if (!options.force && !options.closeSession && drift < SERVER_PROGRESS_SYNC_INTERVAL_S) {
            return;
        }

        resetProgressSync(currentTime);

        {
            const kind: SamoPlaybackTargetKind = requiresEpisode ? 'podcast-episode' : 'audiobook';
            const targetId = requiresEpisode ? episode!.id : item.id;
            const completed =
                duration > 0 && currentTime > 0 && currentTime / Math.max(duration, 1) >= 0.96;

            // Route through the durable retry/offline queue: coalesces by
            // target, retries with backoff, persists across app restarts, and
            // flushes on reconnect — so a blip (or quit) on the close-flush no
            // longer silently drops the position.
            enqueueProgressWrite({
                credential: server.credential,
                kind,
                patch: {
                    completed,
                    progressSeconds: Math.max(0, Math.round(currentTime)),
                    touchLastPlayedAt: Boolean(
                        options.closeSession || options.force || options.reason === 'pause',
                    ),
                    touchLastPositionAt: true,
                },
                targetId,
                url: server.url,
            });
            return;
        }
    };

    return {
        bumpPlayRequest: () => ++playRequestId,
        getLastFlushedPosition: () => lastFlushedPosition,
        isCurrentPlayRequest: (requestId) => requestId === playRequestId,
        resetAfterClose: () => {
            lastFlushedPosition = 0;
            resetProgressSync(0);
        },
        resetProgressSync,
        resetSyncWarnings: () => {},
        setLastFlushedPosition: (position) => {
            lastFlushedPosition = position;
        },
        syncProgress,
    };
}

export function wireAbsPauseProgressFlush(options: {
    source: PlaybackSource;
    sync: AbsPlaybackSyncHandle;
}) {
    subscribePlayerStatus(({ status }, prev) => {
        if (
            prev.status === PlayerStatus.PLAYING &&
            status === PlayerStatus.PAUSED &&
            usePlaybackOwnerStore.getState().source === options.source
        ) {
            options.sync.syncProgress({
                countListeningTime: true,
                force: true,
                reason: 'pause',
            });
        }
    });
}

export function wireAbsPlaybackOwnerHandoff(options: {
    clearTransientState: () => void;
    onLoseOwnership: () => void;
    source: PlaybackSource;
    sync: AbsPlaybackSyncHandle;
}) {
    usePlaybackOwnerStore.subscribe(
        (state) => state.source,
        (source) => {
            if (source !== options.source) {
                options.onLoseOwnership();
                options.clearTransientState();
                options.sync.resetAfterClose();
            }
        },
    );
}

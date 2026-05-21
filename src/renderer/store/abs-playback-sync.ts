import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { clampPosition } from '/@/renderer/store/audiobook-resume-math';
import { subscribePlayerStatus } from '/@/renderer/store/player.store';
import {
    AudiobookshelfLibraryItem,
    AudiobookshelfPodcastEpisode,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';
import { logFn, LogCategory } from '/@/renderer/utils/logger';
import {
    type PlaybackSource,
    usePlaybackOwnerStore,
} from '/@/renderer/store/playback-owner.store';

export const POSITION_PERSIST_DEBOUNCE_S = 10;
export const SERVER_PROGRESS_SYNC_INTERVAL_S = 30;

export type AbsProgressReason = 'close' | 'pause' | 'progress' | 'seek';

export interface AbsPlaybackProgressSlice {
    duration: number;
    episode: AudiobookshelfPodcastEpisode | null | undefined;
    item: AudiobookshelfLibraryItem | null;
    position: number;
    requiresEpisode: boolean;
    server: ServerListItemWithCredential | null;
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

export function createAbsPlaybackSyncHandle(
    logLabel: string,
    getSlice: () => AbsPlaybackProgressSlice,
): AbsPlaybackSyncHandle {
    let lastFlushedPosition = 0;
    let lastServerSyncedPosition = 0;
    let lastServerSyncAtMs = 0;
    let hasLoggedMissingSessionId = false;
    let playRequestId = 0;

    const resetProgressSync = (position: number) => {
        lastServerSyncedPosition = position;
        lastServerSyncAtMs = Date.now();
    };

    const syncProgress: AbsPlaybackSyncHandle['syncProgress'] = (options) => {
        const { duration, episode, item, position, requiresEpisode, server, sessionId } = getSlice();

        if (!item || !server) {
            return;
        }

        if (requiresEpisode && !episode) {
            return;
        }

        if (!sessionId) {
            if (!hasLoggedMissingSessionId) {
                logFn.warn(`[${logLabel}] Audiobookshelf progress sync unavailable`, {
                    category: LogCategory.PLAYER,
                    meta: {
                        episodeId: episode?.id,
                        itemId: item.id,
                        reason: 'missing-session-id',
                        trigger: options.reason,
                    },
                });
                hasLoggedMissingSessionId = true;
            }
            return;
        }

        const currentTime = clampPosition(position, duration);
        const drift = Math.abs(currentTime - lastServerSyncedPosition);
        if (!options.force && !options.closeSession && drift < SERVER_PROGRESS_SYNC_INTERVAL_S) {
            return;
        }

        const now = Date.now();
        const timeListened =
            options.countListeningTime && lastServerSyncAtMs > 0
                ? Math.max(0, (now - lastServerSyncAtMs) / 1000)
                : 0;

        resetProgressSync(currentTime);

        const payload = {
            currentTime,
            duration: Math.max(0, duration),
            timeListened,
        };

        const request = options.closeSession
            ? audiobookshelfController.closePlaybackSession(server, sessionId, payload)
            : audiobookshelfController.syncPlaybackSession(server, sessionId, payload);

        void request.catch((error) => {
            logFn.warn(`[${logLabel}] Audiobookshelf progress sync failed`, {
                category: LogCategory.PLAYER,
                meta: {
                    closeSession: options.closeSession,
                    episodeId: episode?.id,
                    error,
                    itemId: item.id,
                    reason: options.reason,
                    sessionId,
                },
            });
        });
    };

    return {
        bumpPlayRequest: () => ++playRequestId,
        getLastFlushedPosition: () => lastFlushedPosition,
        isCurrentPlayRequest: (requestId) => requestId === playRequestId,
        resetAfterClose: () => {
            lastFlushedPosition = 0;
            resetProgressSync(0);
            hasLoggedMissingSessionId = false;
        },
        resetProgressSync,
        resetSyncWarnings: () => {
            hasLoggedMissingSessionId = false;
        },
        setLastFlushedPosition: (position) => {
            lastFlushedPosition = position;
        },
        syncProgress,
    };
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

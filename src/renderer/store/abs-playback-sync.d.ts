import { AudiobookshelfLibraryItem, AudiobookshelfPodcastEpisode } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { type PlaybackSource } from '/@/renderer/store/playback-owner.store';
export declare const POSITION_PERSIST_DEBOUNCE_S = 10;
export declare const SERVER_PROGRESS_SYNC_INTERVAL_S = 30;
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
export declare function createAbsPlaybackSyncHandle(logLabel: string, getSlice: () => AbsPlaybackProgressSlice): AbsPlaybackSyncHandle;
export declare function wireAbsPlaybackOwnerHandoff(options: {
    clearTransientState: () => void;
    onLoseOwnership: () => void;
    source: PlaybackSource;
    sync: AbsPlaybackSyncHandle;
}): void;
export declare function wireAbsPauseProgressFlush(options: {
    source: PlaybackSource;
    sync: AbsPlaybackSyncHandle;
}): void;

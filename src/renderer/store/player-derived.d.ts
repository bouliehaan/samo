import { PlayerData, QueueData, QueueSong } from '/@/shared/types/domain-types';
import { PlayerRepeat, PlayerShuffle, PlayerStatus } from '/@/shared/types/types';
export type QueueGroupingProperty = keyof QueueSong;
export interface GroupedQueue {
    groups: {
        count: number;
        name: string;
    }[];
    items: QueueSong[];
}
export interface PlayerSnapshotSlice {
    player: {
        index: number;
        playerNum: 1 | 2;
        repeat: PlayerRepeat;
        shuffle: PlayerShuffle;
        status: PlayerStatus;
    };
    queue: QueueData;
}
export declare const EMPTY_PLAYER_DATA: PlayerData;
export declare function getQueueOrderFromState(state: PlayerSnapshotSlice): GroupedQueue;
export declare function getQueueFromState(state: PlayerSnapshotSlice, groupBy?: QueueGroupingProperty): GroupedQueue;
export declare function getCurrentSongFromState(state: {
    playbackSnapshot: PlayerData;
}): QueueSong | undefined;
export declare function getPlayerDataFromState(state: {
    playbackSnapshot: PlayerData;
}): PlayerData;
export declare function isFirstTrackInQueueFromState(state: PlayerSnapshotSlice): boolean;
export declare function isLastTrackInQueueFromState(state: PlayerSnapshotSlice): boolean;
export declare function getQueueItemsFromState(state: PlayerSnapshotSlice): QueueSong[];
export declare function computePlayerData(state: PlayerSnapshotSlice): PlayerData;
export type PlaybackInputs = {
    defaultLen: number;
    index: number;
    playerNum: 1 | 2;
    repeat: PlayerRepeat;
    revision: number;
    shuffledKey: string;
    shuffle: PlayerShuffle;
    status: PlayerStatus;
};
export declare function getPlaybackInputs(state: PlayerSnapshotSlice): PlaybackInputs;
export declare function playbackInputsEqual(a: PlaybackInputs, b: PlaybackInputs): boolean;
/** Bump when queue song records mutate without changing order/shuffle inputs. */
export declare function touchQueueRevision(queue: QueueData): void;

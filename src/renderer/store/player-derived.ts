import {
    calculateNextSong,
    isShuffleEnabled,
    mapShuffledToQueueIndex,
} from '/@/renderer/store/player-queue-math';
import { PlayerData, QueueData, QueueSong } from '/@/shared/types/domain-types';
import { PlayerRepeat, PlayerShuffle, PlayerStatus } from '/@/shared/types/types';

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

export const EMPTY_PLAYER_DATA: PlayerData = {
    currentSong: undefined,
    index: -1,
    nextSong: undefined,
    num: 1,
    player1: undefined,
    player2: undefined,
    previousSong: undefined,
    queueLength: 0,
    status: PlayerStatus.PAUSED,
};

export function getQueueItemsFromState(state: PlayerSnapshotSlice): QueueSong[] {
    const songs = state.queue.songs;
    const items: QueueSong[] = [];

    for (const id of state.queue.default) {
        const song = songs[id];
        if (song) {
            items.push(song);
        }
    }

    return items;
}

export function computePlayerData(state: PlayerSnapshotSlice): PlayerData {
    const queueItems = getQueueItemsFromState(state);
    const index = state.player.index;

    let queueIndex = index;
    if (isShuffleEnabled(state)) {
        queueIndex = mapShuffledToQueueIndex(index, state.queue.shuffled);
    }

    const currentSong = queueItems[queueIndex];
    const repeat = state.player.repeat;

    let previousSong: QueueSong | undefined;
    if (isShuffleEnabled(state)) {
        const previousShuffledIndex = index - 1;
        if (previousShuffledIndex >= 0) {
            const previousQueueIndex = state.queue.shuffled[previousShuffledIndex];
            previousSong = queueItems[previousQueueIndex];
        } else if (repeat === PlayerRepeat.ALL) {
            const lastShuffledIndex = state.queue.shuffled.length - 1;
            const lastQueueIndex = state.queue.shuffled[lastShuffledIndex];
            previousSong = queueItems[lastQueueIndex];
        }
    } else {
        previousSong = queueIndex > 0 ? queueItems[queueIndex - 1] : undefined;
    }

    let nextSong: QueueSong | undefined;
    if (isShuffleEnabled(state) && repeat !== PlayerRepeat.ONE) {
        const nextShuffledIndex = index + 1;
        if (nextShuffledIndex < state.queue.shuffled.length) {
            const nextQueueIndex = state.queue.shuffled[nextShuffledIndex];
            nextSong = queueItems[nextQueueIndex];
        } else if (repeat === PlayerRepeat.ALL) {
            const firstQueueIndex = state.queue.shuffled[0];
            nextSong = queueItems[firstQueueIndex];
        }
    } else {
        nextSong = calculateNextSong(queueIndex, queueItems, repeat);
    }

    return {
        currentSong,
        index: queueIndex,
        nextSong,
        num: state.player.playerNum,
        player1: state.player.playerNum === 1 ? currentSong : nextSong,
        player2: state.player.playerNum === 2 ? currentSong : nextSong,
        previousSong,
        queueLength: state.queue.default.length,
        status: state.player.status,
    };
}

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

export function getPlaybackInputs(state: PlayerSnapshotSlice): PlaybackInputs {
    return {
        defaultLen: state.queue.default.length,
        index: state.player.index,
        playerNum: state.player.playerNum,
        repeat: state.player.repeat,
        revision: state.queue.revision ?? 0,
        shuffledKey: state.queue.shuffled.join(','),
        shuffle: state.player.shuffle,
        status: state.player.status,
    };
}

export function playbackInputsEqual(a: PlaybackInputs, b: PlaybackInputs): boolean {
    return (
        a.index === b.index &&
        a.playerNum === b.playerNum &&
        a.repeat === b.repeat &&
        a.shuffle === b.shuffle &&
        a.status === b.status &&
        a.defaultLen === b.defaultLen &&
        a.shuffledKey === b.shuffledKey &&
        a.revision === b.revision
    );
}

/** Bump when queue song records mutate without changing order/shuffle inputs. */
export function touchQueueRevision(queue: QueueData): void {
    queue.revision = (queue.revision ?? 0) + 1;
}

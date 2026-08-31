import { calculateNextSong } from '/@/renderer/store/player-queue-math';
import { PlayerData, QueueData, QueueSong } from '/@/shared/types/domain-types';
import { PlayerRepeat, PlayerShuffle, PlayerStatus } from '/@/shared/types/types';

export interface GroupedQueue {
    groups: { count: number; name: string }[];
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

export type QueueGroupingProperty = keyof QueueSong;

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

export type PlaybackInputs = {
    currentUniqueId: string;
    defaultLen: number;
    index: number;
    playerNum: 1 | 2;
    repeat: PlayerRepeat;
    revision: number;
    shuffle: PlayerShuffle;
    status: PlayerStatus;
};

const resolveCurrentQueueUniqueId = (state: PlayerSnapshotSlice): string => {
    const queueItems = getQueueItemsFromState(state);
    const index = state.player.index;

    if (index < 0 || queueItems.length === 0) {
        return '';
    }

    return queueItems[index]?._uniqueId ?? '';
};

export function computePlayerData(state: PlayerSnapshotSlice): PlayerData {
    const queueItems = getQueueItemsFromState(state);
    const queueIndex = state.player.index;

    const currentSong = queueItems[queueIndex];
    const repeat = state.player.repeat;

    const previousSong = queueIndex > 0 ? queueItems[queueIndex - 1] : undefined;
    const nextSong = calculateNextSong(queueIndex, queueItems, repeat);

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

export function getCurrentSongFromState(state: {
    playbackSnapshot: PlayerData;
}): QueueSong | undefined {
    return state.playbackSnapshot.currentSong;
}

export function getPlaybackInputs(state: PlayerSnapshotSlice): PlaybackInputs {
    return {
        currentUniqueId: resolveCurrentQueueUniqueId(state),
        defaultLen: state.queue.default.length,
        index: state.player.index,
        playerNum: state.player.playerNum,
        repeat: state.player.repeat,
        revision: state.queue.revision ?? 0,
        shuffle: state.player.shuffle,
        status: state.player.status,
    };
}

export function getPlayerDataFromState(state: { playbackSnapshot: PlayerData }): PlayerData {
    return state.playbackSnapshot;
}

export function getQueueFromState(
    state: PlayerSnapshotSlice,
    groupBy?: QueueGroupingProperty,
): GroupedQueue {
    const queue = getQueueOrderFromState(state);

    if (!groupBy) {
        return queue;
    }

    return groupQueueItems(queue, groupBy);
}

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

export function getQueueOrderFromState(state: PlayerSnapshotSlice): GroupedQueue {
    const items = getQueueItemsFromState(state);

    return {
        groups: [{ count: items.length, name: 'All' }],
        items,
    };
}

export function isFirstTrackInQueueFromState(state: PlayerSnapshotSlice): boolean {
    return state.player.index === 0;
}

export function isLastTrackInQueueFromState(state: PlayerSnapshotSlice): boolean {
    const queue = getQueueOrderFromState(state);
    return state.player.index === queue.items.length - 1;
}

export function playbackInputsEqual(a: PlaybackInputs, b: PlaybackInputs): boolean {
    return (
        a.currentUniqueId === b.currentUniqueId &&
        a.index === b.index &&
        a.playerNum === b.playerNum &&
        a.repeat === b.repeat &&
        a.shuffle === b.shuffle &&
        a.status === b.status &&
        a.defaultLen === b.defaultLen &&
        a.revision === b.revision
    );
}

/** Bump when queue song records mutate without changing order/shuffle inputs. */
export function touchQueueRevision(queue: QueueData): void {
    queue.revision = (queue.revision ?? 0) + 1;
}

function groupQueueItems(queue: GroupedQueue, groupBy: QueueGroupingProperty): GroupedQueue {
    const groups: { count: number; name: string }[] = [];
    const seenGroups = new Set<string>();

    queue.items.forEach((item) => {
        const groupValue = String(item[groupBy] || 'Unknown');

        if (!seenGroups.has(groupValue)) {
            seenGroups.add(groupValue);
            groups.push({ count: 1, name: groupValue });
            return;
        }

        const previousGroup = groups[groups.length - 1];
        if (previousGroup.name !== groupValue) {
            groups.push({ count: 1, name: groupValue });
            return;
        }

        groups[groups.length - 1].count++;
    });

    return { groups, items: queue.items };
}

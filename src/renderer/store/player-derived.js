import { calculateNextSong, isShuffleEnabled, mapShuffledToQueueIndex, } from '/@/renderer/store/player-queue-math';
import { PlayerRepeat, PlayerStatus } from '/@/shared/types/types';
export const EMPTY_PLAYER_DATA = {
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
export function getQueueOrderFromState(state) {
    const songs = state.queue.songs;
    const defaultIds = state.queue.default;
    const items = [];
    for (const id of defaultIds) {
        const song = songs[id];
        if (song) {
            items.push(song);
        }
    }
    return {
        groups: [{ count: items.length, name: 'All' }],
        items,
    };
}
function groupQueueItems(queue, groupBy) {
    const groups = [];
    const seenGroups = new Set();
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
export function getQueueFromState(state, groupBy) {
    const queue = getQueueOrderFromState(state);
    if (!groupBy) {
        return queue;
    }
    return groupQueueItems(queue, groupBy);
}
export function getCurrentSongFromState(state) {
    return state.playbackSnapshot.currentSong;
}
export function getPlayerDataFromState(state) {
    return state.playbackSnapshot;
}
export function isFirstTrackInQueueFromState(state) {
    return state.player.index === 0;
}
export function isLastTrackInQueueFromState(state) {
    const queue = getQueueOrderFromState(state);
    return state.player.index === queue.items.length - 1;
}
export function getQueueItemsFromState(state) {
    const songs = state.queue.songs;
    const items = [];
    for (const id of state.queue.default) {
        const song = songs[id];
        if (song) {
            items.push(song);
        }
    }
    return items;
}
export function computePlayerData(state) {
    const queueItems = getQueueItemsFromState(state);
    const index = state.player.index;
    let queueIndex = index;
    if (isShuffleEnabled(state)) {
        queueIndex = mapShuffledToQueueIndex(index, state.queue.shuffled);
    }
    const currentSong = queueItems[queueIndex];
    const repeat = state.player.repeat;
    let previousSong;
    if (isShuffleEnabled(state)) {
        const previousShuffledIndex = index - 1;
        if (previousShuffledIndex >= 0) {
            const previousQueueIndex = state.queue.shuffled[previousShuffledIndex];
            previousSong = queueItems[previousQueueIndex];
        }
        else if (repeat === PlayerRepeat.ALL) {
            const lastShuffledIndex = state.queue.shuffled.length - 1;
            const lastQueueIndex = state.queue.shuffled[lastShuffledIndex];
            previousSong = queueItems[lastQueueIndex];
        }
    }
    else {
        previousSong = queueIndex > 0 ? queueItems[queueIndex - 1] : undefined;
    }
    let nextSong;
    if (isShuffleEnabled(state) && repeat !== PlayerRepeat.ONE) {
        const nextShuffledIndex = index + 1;
        if (nextShuffledIndex < state.queue.shuffled.length) {
            const nextQueueIndex = state.queue.shuffled[nextShuffledIndex];
            nextSong = queueItems[nextQueueIndex];
        }
        else if (repeat === PlayerRepeat.ALL) {
            const firstQueueIndex = state.queue.shuffled[0];
            nextSong = queueItems[firstQueueIndex];
        }
    }
    else {
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
export function getPlaybackInputs(state) {
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
export function playbackInputsEqual(a, b) {
    return (a.index === b.index &&
        a.playerNum === b.playerNum &&
        a.repeat === b.repeat &&
        a.shuffle === b.shuffle &&
        a.status === b.status &&
        a.defaultLen === b.defaultLen &&
        a.shuffledKey === b.shuffledKey &&
        a.revision === b.revision);
}
/** Bump when queue song records mutate without changing order/shuffle inputs. */
export function touchQueueRevision(queue) {
    queue.revision = (queue.revision ?? 0) + 1;
}

import { touchQueueRevision } from '/@/renderer/store/player-derived';
import {
    adjustShuffledIndexesForInsertion,
    generateShuffledIndexes,
    isShuffleEnabled,
} from '/@/renderer/store/player-queue-math';
import { shuffleInPlace } from '/@/renderer/utils/shuffle';
import { QueueSong } from '/@/shared/types/domain-types';
import { PlayerShuffle } from '/@/shared/types/types';

/** Queue/player fields touched by `addToQueueByType` — kept separate for unit tests. */
export interface PlayerQueueMutationState {
    player: {
        index: number;
        shuffle: PlayerShuffle;
    };
    queue: {
        default: string[];
        revision?: number;
        shuffled: number[];
        songs: Record<string, QueueSong>;
    };
}

export function applyAddToQueueLast(state: PlayerQueueMutationState, uniqueIds: string[]): void {
    const oldQueueLength = state.queue.default.length;
    state.queue.default = [...state.queue.default, ...uniqueIds];

    if (!isShuffleEnabled(state)) {
        return;
    }

    const newIndexes = Array.from({ length: uniqueIds.length }, (_, i) => oldQueueLength + i);
    const shuffledNewIndexes = shuffleInPlace([...newIndexes]);
    state.queue.shuffled = [...state.queue.shuffled, ...shuffledNewIndexes];
}

export function applyAddToQueueLastShuffle(
    state: PlayerQueueMutationState,
    shuffledIds: string[],
): void {
    const oldQueueLength = state.queue.default.length;
    state.queue.default = [...state.queue.default, ...shuffledIds];

    if (state.player.shuffle !== PlayerShuffle.TRACK) {
        return;
    }

    const newIndexes = Array.from({ length: shuffledIds.length }, (_, i) => oldQueueLength + i);
    const shuffledNewIndexes = shuffleInPlace([...newIndexes]);
    state.queue.shuffled = [...state.queue.shuffled, ...shuffledNewIndexes];
}

export function applyAddToQueueNext(state: PlayerQueueMutationState, uniqueIds: string[]): void {
    const currentShuffledIndex = state.player.index;
    const insertPosition =
        state.player.shuffle === PlayerShuffle.TRACK
            ? state.queue.shuffled[currentShuffledIndex] + 1
            : currentShuffledIndex + 1;

    state.queue.default = [
        ...state.queue.default.slice(0, insertPosition),
        ...uniqueIds,
        ...state.queue.default.slice(insertPosition),
    ];

    if (!isShuffleEnabled(state)) {
        return;
    }

    const adjustedShuffled = adjustShuffledIndexesForInsertion(
        state.queue.shuffled,
        insertPosition,
        uniqueIds.length,
    );
    const newIndexes = Array.from({ length: uniqueIds.length }, (_, i) => insertPosition + i);
    const shuffledNewIndexes = shuffleInPlace([...newIndexes]);
    state.queue.shuffled = [
        ...adjustedShuffled.slice(0, currentShuffledIndex + 1),
        ...shuffledNewIndexes,
        ...adjustedShuffled.slice(currentShuffledIndex + 1),
    ];
}

export function applyAddToQueueNextShuffle(
    state: PlayerQueueMutationState,
    shuffledIds: string[],
): void {
    const currentShuffledIndex = state.player.index;
    const insertPosition = isShuffleEnabled(state)
        ? state.queue.shuffled[currentShuffledIndex] + 1
        : currentShuffledIndex + 1;

    state.queue.default = [
        ...state.queue.default.slice(0, insertPosition),
        ...shuffledIds,
        ...state.queue.default.slice(insertPosition),
    ];

    if (!isShuffleEnabled(state)) {
        return;
    }

    const adjustedShuffled = adjustShuffledIndexesForInsertion(
        state.queue.shuffled,
        insertPosition,
        shuffledIds.length,
    );
    const newIndexes = Array.from({ length: shuffledIds.length }, (_, i) => insertPosition + i);
    const shuffledNewIndexes = shuffleInPlace([...newIndexes]);
    state.queue.shuffled = [
        ...adjustedShuffled.slice(0, currentShuffledIndex + 1),
        ...shuffledNewIndexes,
        ...adjustedShuffled.slice(currentShuffledIndex + 1),
    ];
}

export function applyAddToQueueNow(
    state: PlayerQueueMutationState,
    uniqueIds: string[],
    targetSongUniqueId?: string,
): void {
    state.queue.default = uniqueIds;
    state.player.index = 0;
    touchQueueRevision(state.queue);

    if (state.player.shuffle !== PlayerShuffle.TRACK) {
        return;
    }

    if (targetSongUniqueId) {
        const initialIndex = uniqueIds.findIndex((id) => id === targetSongUniqueId);
        if (initialIndex !== -1) {
            const allIndexes = Array.from({ length: uniqueIds.length }, (_, i) => i);
            const remainingIndexes = allIndexes.filter((idx) => idx !== initialIndex);
            const shuffledRemaining = shuffleInPlace([...remainingIndexes]);
            state.queue.shuffled = [initialIndex, ...shuffledRemaining];
            return;
        }
    }

    state.queue.shuffled = generateShuffledIndexes(uniqueIds.length);
}

export function applyAddToQueueShuffle(
    state: PlayerQueueMutationState,
    shuffledIds: string[],
): void {
    state.queue.default = shuffledIds;
    state.player.index = 0;
    state.queue.shuffled = generateShuffledIndexes(shuffledIds.length);
    touchQueueRevision(state.queue);
}

export function registerQueueSongs(state: PlayerQueueMutationState, items: QueueSong[]): string[] {
    const uniqueIds = items.map((item) => item._uniqueId);
    items.forEach((item) => {
        state.queue.songs[item._uniqueId] = item;
    });
    return uniqueIds;
}

import { touchQueueRevision } from '/@/renderer/store/player-derived';
import { restoreQueueOrder, shuffleQueueAroundIndex } from '/@/renderer/store/player-queue-math';
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
        songs: Record<string, QueueSong>;
        unshuffled: null | string[];
    };
}

export function applyAddToQueueLast(state: PlayerQueueMutationState, uniqueIds: string[]): void {
    // With shuffle on the queue *is* shuffled, so tracks joining it are shuffled
    // among themselves rather than appended in their source order.
    const idsToAppend = isShuffled(state) ? shuffleInPlace([...uniqueIds]) : uniqueIds;
    state.queue.default = [...state.queue.default, ...idsToAppend];
}

export function applyAddToQueueLastShuffle(
    state: PlayerQueueMutationState,
    shuffledIds: string[],
): void {
    state.queue.default = [...state.queue.default, ...shuffledIds];
}

export function applyAddToQueueNext(state: PlayerQueueMutationState, uniqueIds: string[]): void {
    const idsToInsert = isShuffled(state) ? shuffleInPlace([...uniqueIds]) : uniqueIds;
    insertAfterCurrent(state, idsToInsert);
}

export function applyAddToQueueNextShuffle(
    state: PlayerQueueMutationState,
    shuffledIds: string[],
): void {
    insertAfterCurrent(state, shuffledIds);
}

export function applyAddToQueueNow(
    state: PlayerQueueMutationState,
    uniqueIds: string[],
    targetSongUniqueId?: string,
): void {
    if (!isShuffled(state)) {
        state.queue.default = uniqueIds;
        state.queue.unshuffled = null;
        state.player.index = 0;
        touchQueueRevision(state.queue);
        return;
    }

    // Shuffle is on, so a fresh queue arrives shuffled — with whichever track the
    // user actually clicked pinned to the front so that one plays first.
    const initialIndex = targetSongUniqueId ? uniqueIds.indexOf(targetSongUniqueId) : -1;
    const rest = uniqueIds.filter((_, index) => index !== initialIndex);
    const shuffled = shuffleInPlace(rest);

    state.queue.default = initialIndex === -1 ? shuffled : [uniqueIds[initialIndex], ...shuffled];
    state.queue.unshuffled = [...uniqueIds];
    state.player.index = 0;
    touchQueueRevision(state.queue);
}

export function applyAddToQueueShuffle(
    state: PlayerQueueMutationState,
    shuffledIds: string[],
    orderedIds: string[],
): void {
    state.queue.default = shuffledIds;
    // Only worth remembering while shuffle is on — that is the only state the
    // shuffle toggle can restore from.
    state.queue.unshuffled = isShuffled(state) ? [...orderedIds] : null;
    state.player.index = 0;
    touchQueueRevision(state.queue);
}

/**
 * Turns shuffle on by reordering the queue itself.
 *
 * The track that is playing moves to the head so it is not interrupted, and every
 * other track is shuffled behind it — the queue the user is looking at *is* the
 * order that will play, rather than a separate permutation read behind their back.
 *
 * @param options.keepRestorePoint - Set when re-shuffling an already-shuffled queue,
 * so the order to restore stays the one from before shuffle was first switched on.
 */
export function applyShuffleQueue(
    state: PlayerQueueMutationState,
    options?: { keepRestorePoint?: boolean },
): void {
    if (state.queue.default.length === 0) {
        state.queue.unshuffled = null;
        return;
    }

    if (!options?.keepRestorePoint || !state.queue.unshuffled) {
        state.queue.unshuffled = [...state.queue.default];
    }

    state.queue.default = shuffleQueueAroundIndex(state.queue.default, state.player.index);
    state.player.index = state.player.index >= 0 ? 0 : -1;
}

/** Turns shuffle off by putting the queue back the way it was, current track and all. */
export function applyUnshuffleQueue(state: PlayerQueueMutationState): void {
    const currentUniqueId = state.queue.default[state.player.index];
    const restored = restoreQueueOrder(state.queue.default, state.queue.unshuffled);

    state.queue.default = restored;
    state.queue.unshuffled = null;

    if (currentUniqueId !== undefined) {
        state.player.index = Math.max(0, restored.indexOf(currentUniqueId));
    }
}

export function registerQueueSongs(state: PlayerQueueMutationState, items: QueueSong[]): string[] {
    const uniqueIds = items.map((item) => item._uniqueId);
    items.forEach((item) => {
        state.queue.songs[item._uniqueId] = item;
    });
    return uniqueIds;
}

function insertAfterCurrent(state: PlayerQueueMutationState, uniqueIds: string[]): void {
    const insertPosition = state.player.index + 1;

    state.queue.default = [
        ...state.queue.default.slice(0, insertPosition),
        ...uniqueIds,
        ...state.queue.default.slice(insertPosition),
    ];
}

function isShuffled(state: PlayerQueueMutationState): boolean {
    return state.player.shuffle === PlayerShuffle.TRACK;
}

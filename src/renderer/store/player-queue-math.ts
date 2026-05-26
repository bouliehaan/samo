import { PlayerRepeat, PlayerShuffle } from '@samo/core/playback';

import { shuffleInPlace } from '/@/renderer/utils/shuffle';
import { QueueSong } from '/@/shared/types/domain-types';

export function addIndexesToShuffled(
    shuffled: number[],
    currentShuffledIndex: number,
    newIndexes: number[],
): number[] {
    const beforeCurrent = shuffled.slice(0, currentShuffledIndex + 1);
    const afterCurrent = shuffled.slice(currentShuffledIndex + 1);
    const toShuffle = [...afterCurrent, ...newIndexes];
    return [...beforeCurrent, ...shuffleInPlace(toShuffle)];
}

export function adjustShuffledIndexesForInsertion(
    shuffled: number[],
    insertPosition: number,
    insertCount: number,
): number[] {
    return shuffled.map((idx) => {
        if (idx >= insertPosition) {
            return idx + insertCount;
        }
        return idx;
    });
}

export function calculateNextIndex(
    currentIndex: number,
    queueLength: number,
    repeat: PlayerRepeat,
): { nextIndex: number; shouldPause: boolean } {
    const isLastTrack = currentIndex === queueLength - 1;

    if (repeat === PlayerRepeat.ONE) {
        return { nextIndex: currentIndex, shouldPause: false };
    }

    if (repeat === PlayerRepeat.ALL) {
        if (isLastTrack) {
            return { nextIndex: 0, shouldPause: false };
        }
        return { nextIndex: currentIndex + 1, shouldPause: false };
    }

    if (isLastTrack) {
        return { nextIndex: 0, shouldPause: true };
    }
    return { nextIndex: currentIndex + 1, shouldPause: false };
}

/** Calculates the next song based on repeat mode and current position. */
export function calculateNextSong(
    currentIndex: number,
    queueItems: QueueSong[],
    repeat: PlayerRepeat,
): QueueSong | undefined {
    if (queueItems.length === 0) {
        return undefined;
    }

    if (repeat === PlayerRepeat.ONE) {
        return queueItems[currentIndex];
    }

    if (repeat === PlayerRepeat.ALL) {
        const isLastTrack = currentIndex === queueItems.length - 1;
        return isLastTrack ? queueItems[0] : queueItems[currentIndex + 1];
    }

    return queueItems[currentIndex + 1];
}

export function findShuffledPositionForQueueIndex(
    queueIndex: number,
    shuffled: number[],
): number | undefined {
    const shuffledPosition = shuffled.findIndex((idx) => idx === queueIndex);
    return shuffledPosition !== -1 ? shuffledPosition : undefined;
}

export function generateShuffledIndexes(length: number): number[] {
    const indexes = Array.from({ length }, (_, i) => i);
    return shuffleInPlace(indexes);
}

export function isShuffleEnabled(state: {
    player: { shuffle: PlayerShuffle };
    queue: { shuffled: number[] };
}): boolean {
    return state.player.shuffle === PlayerShuffle.TRACK && state.queue.shuffled.length > 0;
}

export function mapShuffledToQueueIndex(shuffledIndex: number, shuffled: number[]): number {
    if (shuffledIndex >= 0 && shuffledIndex < shuffled.length) {
        return shuffled[shuffledIndex];
    }
    return shuffledIndex;
}

export function regenerateShuffledIndexesIfNeeded(state: {
    player: { shuffle: PlayerShuffle };
    queue: { default: string[]; shuffled: number[] };
}): void {
    if (isShuffleEnabled(state)) {
        state.queue.shuffled = generateShuffledIndexes(state.queue.default.length);
    }
}

import { PlayerRepeat, PlayerShuffle } from '@samo/core/playback';
import { QueueSong } from '/@/shared/types/domain-types';
/** Calculates the next song based on repeat mode and current position. */
export declare function calculateNextSong(currentIndex: number, queueItems: QueueSong[], repeat: PlayerRepeat): QueueSong | undefined;
export declare function isShuffleEnabled(state: {
    player: {
        shuffle: PlayerShuffle;
    };
    queue: {
        shuffled: number[];
    };
}): boolean;
export declare function mapShuffledToQueueIndex(shuffledIndex: number, shuffled: number[]): number;
export declare function addIndexesToShuffled(shuffled: number[], currentShuffledIndex: number, newIndexes: number[]): number[];
export declare function adjustShuffledIndexesForInsertion(shuffled: number[], insertPosition: number, insertCount: number): number[];
export declare function calculateNextIndex(currentIndex: number, queueLength: number, repeat: PlayerRepeat): {
    nextIndex: number;
    shouldPause: boolean;
};
export declare function findShuffledPositionForQueueIndex(queueIndex: number, shuffled: number[]): number | undefined;
export declare function generateShuffledIndexes(length: number): number[];
export declare function regenerateShuffledIndexesIfNeeded(state: {
    player: {
        shuffle: PlayerShuffle;
    };
    queue: {
        default: string[];
        shuffled: number[];
    };
}): void;

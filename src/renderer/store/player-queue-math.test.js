import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerRepeat, PlayerShuffle } from '@samo/core/playback';
import { addIndexesToShuffled, adjustShuffledIndexesForInsertion, calculateNextIndex, calculateNextSong, findShuffledPositionForQueueIndex, generateShuffledIndexes, isShuffleEnabled, mapShuffledToQueueIndex, regenerateShuffledIndexesIfNeeded, } from './player-queue-math';
const song = (id) => ({
    _uniqueId: id,
    id,
    name: id,
});
describe('calculateNextSong', () => {
    const queue = [song('a'), song('b'), song('c')];
    it('returns undefined for an empty queue', () => {
        expect(calculateNextSong(0, [], PlayerRepeat.NONE)).toBeUndefined();
    });
    it('repeats the current track when repeat is ONE', () => {
        expect(calculateNextSong(1, queue, PlayerRepeat.ONE)).toBe(queue[1]);
    });
    it('wraps to the first track when repeat is ALL at the end', () => {
        expect(calculateNextSong(2, queue, PlayerRepeat.ALL)).toBe(queue[0]);
    });
    it('advances within the queue when repeat is ALL', () => {
        expect(calculateNextSong(0, queue, PlayerRepeat.ALL)).toBe(queue[1]);
    });
    it('returns undefined past the end when repeat is NONE', () => {
        expect(calculateNextSong(2, queue, PlayerRepeat.NONE)).toBeUndefined();
    });
});
describe('isShuffleEnabled', () => {
    it('is true only for track shuffle with a non-empty shuffled map', () => {
        expect(isShuffleEnabled({
            player: { shuffle: PlayerShuffle.TRACK },
            queue: { shuffled: [2, 0, 1] },
        })).toBe(true);
        expect(isShuffleEnabled({
            player: { shuffle: PlayerShuffle.TRACK },
            queue: { shuffled: [] },
        })).toBe(false);
        expect(isShuffleEnabled({
            player: { shuffle: PlayerShuffle.NONE },
            queue: { shuffled: [0, 1] },
        })).toBe(false);
    });
});
describe('mapShuffledToQueueIndex', () => {
    it('maps a shuffled position to the underlying queue index', () => {
        expect(mapShuffledToQueueIndex(1, [2, 0, 1])).toBe(0);
    });
    it('falls back to the input index when out of range', () => {
        expect(mapShuffledToQueueIndex(9, [2, 0, 1])).toBe(9);
    });
});
describe('calculateNextIndex', () => {
    it('stays on the current index for repeat ONE', () => {
        expect(calculateNextIndex(1, 3, PlayerRepeat.ONE)).toEqual({
            nextIndex: 1,
            shouldPause: false,
        });
    });
    it('loops to index 0 for repeat ALL at the end', () => {
        expect(calculateNextIndex(2, 3, PlayerRepeat.ALL)).toEqual({
            nextIndex: 0,
            shouldPause: false,
        });
    });
    it('signals pause at the end when repeat is NONE', () => {
        expect(calculateNextIndex(2, 3, PlayerRepeat.NONE)).toEqual({
            nextIndex: 0,
            shouldPause: true,
        });
    });
});
describe('adjustShuffledIndexesForInsertion', () => {
    it('shifts indexes at and after the insert position', () => {
        expect(adjustShuffledIndexesForInsertion([0, 2, 1], 1, 2)).toEqual([0, 4, 3]);
    });
});
describe('addIndexesToShuffled', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('keeps the prefix through the current shuffled index and appends a reshuffled tail', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const result = addIndexesToShuffled([2, 0, 1], 0, [3, 4]);
        expect(result[0]).toBe(2);
        expect(result).toHaveLength(5);
        expect(result).toEqual(expect.arrayContaining([0, 1, 3, 4]));
    });
});
describe('findShuffledPositionForQueueIndex', () => {
    it('returns the shuffled slot for a queue index', () => {
        expect(findShuffledPositionForQueueIndex(0, [2, 0, 1])).toBe(1);
    });
    it('returns undefined when the queue index is not in the shuffle map', () => {
        expect(findShuffledPositionForQueueIndex(5, [2, 0, 1])).toBeUndefined();
    });
});
describe('generateShuffledIndexes', () => {
    it('returns a permutation of 0..length-1', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.25);
        const shuffled = generateShuffledIndexes(4);
        expect(shuffled).toHaveLength(4);
        expect([...shuffled].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    });
});
describe('regenerateShuffledIndexesIfNeeded', () => {
    it('rebuilds shuffled indexes when track shuffle is already active', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const state = {
            player: { shuffle: PlayerShuffle.TRACK },
            queue: { default: ['a', 'b', 'c'], shuffled: [2, 0, 1] },
        };
        regenerateShuffledIndexesIfNeeded(state);
        expect(state.queue.shuffled).toHaveLength(3);
        expect([...state.queue.shuffled].sort((a, b) => a - b)).toEqual([0, 1, 2]);
    });
    it('does nothing when shuffle is off or the shuffled map is empty', () => {
        const state = {
            player: { shuffle: PlayerShuffle.TRACK },
            queue: { default: ['a', 'b', 'c'], shuffled: [] },
        };
        regenerateShuffledIndexesIfNeeded(state);
        expect(state.queue.shuffled).toEqual([]);
    });
});

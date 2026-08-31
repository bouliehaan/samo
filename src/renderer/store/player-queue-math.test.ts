import { PlayerRepeat } from '@samo/core/playback';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    calculateNextIndex,
    calculateNextSong,
    restoreQueueOrder,
    shuffleQueueAroundIndex,
} from './player-queue-math';

import { QueueSong } from '/@/shared/types/domain-types';

const song = (id: string): QueueSong =>
    ({
        _uniqueId: id,
        id,
        name: id,
    }) as QueueSong;

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

describe('shuffleQueueAroundIndex', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('moves the playing track to the head and keeps every other track', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = shuffleQueueAroundIndex(['a', 'b', 'c', 'd'], 2);

        expect(result[0]).toBe('c');
        expect([...result].sort()).toEqual(['a', 'b', 'c', 'd']);
    });

    it('shuffles everything when nothing is playing', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = shuffleQueueAroundIndex(['a', 'b', 'c'], -1);

        expect([...result].sort()).toEqual(['a', 'b', 'c']);
    });

    it('leaves a queue of one alone', () => {
        expect(shuffleQueueAroundIndex(['a'], 0)).toEqual(['a']);
        expect(shuffleQueueAroundIndex([], -1)).toEqual([]);
    });
});

describe('restoreQueueOrder', () => {
    it('puts the queue back into the snapshot order', () => {
        expect(restoreQueueOrder(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('drops tracks removed while shuffled', () => {
        expect(restoreQueueOrder(['c', 'a'], ['a', 'b', 'c'])).toEqual(['a', 'c']);
    });

    it('keeps a track queued next to the track it was queued behind', () => {
        // "play next" behind `c` while shuffled — `x` should stay behind `c`,
        // not get flung to the end when the original order comes back.
        expect(restoreQueueOrder(['c', 'x', 'a', 'b'], ['a', 'b', 'c'])).toEqual([
            'a',
            'b',
            'c',
            'x',
        ]);
    });

    it('appends tracks added to the end of a shuffled queue', () => {
        expect(restoreQueueOrder(['b', 'a', 'c', 'x', 'y'], ['a', 'b', 'c'])).toEqual([
            'a',
            'b',
            'c',
            'x',
            'y',
        ]);
    });

    it('keeps a track added at the head at the head', () => {
        expect(restoreQueueOrder(['x', 'b', 'a'], ['a', 'b'])).toEqual(['x', 'a', 'b']);
    });

    it('returns the queue untouched when there is no snapshot', () => {
        expect(restoreQueueOrder(['b', 'a'], null)).toEqual(['b', 'a']);
    });
});

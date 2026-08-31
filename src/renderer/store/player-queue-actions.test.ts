import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    applyAddToQueueLast,
    applyAddToQueueNext,
    applyAddToQueueNow,
    applyAddToQueueShuffle,
    applyShuffleQueue,
    applyUnshuffleQueue,
    type PlayerQueueMutationState,
    registerQueueSongs,
} from './player-queue-actions';

import { QueueSong } from '/@/shared/types/domain-types';
import { PlayerShuffle } from '/@/shared/types/types';

vi.mock('/@/renderer/utils/shuffle', () => ({
    shuffleInPlace: <T>(items: T[]) => {
        const next = [...items];
        next.reverse();
        return next;
    },
}));

const song = (id: string): QueueSong =>
    ({
        _uniqueId: `uid-${id}`,
        id,
        name: id,
    }) as QueueSong;

const emptyState = (): PlayerQueueMutationState => ({
    player: { index: 0, shuffle: PlayerShuffle.NONE },
    queue: { default: [], songs: {}, unshuffled: null },
});

describe('registerQueueSongs + applyAddToQueueLast', () => {
    it('appends track ids to the queue', () => {
        const state = emptyState();
        const items = [song('a'), song('b')];
        const ids = registerQueueSongs(state, items);
        applyAddToQueueLast(state, ids);
        expect(state.queue.default).toEqual(['uid-a', 'uid-b']);
        expect(Object.keys(state.queue.songs)).toHaveLength(2);
    });

    it('shuffles the appended tracks into a shuffled queue', () => {
        const state = emptyState();
        state.player.shuffle = PlayerShuffle.TRACK;
        state.queue.default = ['uid-existing'];
        const ids = registerQueueSongs(state, [song('n'), song('o')]);
        applyAddToQueueLast(state, ids);
        expect(state.queue.default).toEqual(['uid-existing', 'uid-o', 'uid-n']);
    });
});

describe('applyAddToQueueNext', () => {
    it('inserts after the current index', () => {
        const state = emptyState();
        state.queue.default = ['uid-a', 'uid-b'];
        state.player.index = 0;
        registerQueueSongs(state, [song('x')]);
        applyAddToQueueNext(state, ['uid-x']);
        expect(state.queue.default).toEqual(['uid-a', 'uid-x', 'uid-b']);
    });

    it('inserts after the current index of a shuffled queue too', () => {
        const state = emptyState();
        state.player.shuffle = PlayerShuffle.TRACK;
        state.queue.default = ['uid-a', 'uid-b'];
        state.player.index = 0;
        registerQueueSongs(state, [song('x'), song('y')]);
        applyAddToQueueNext(state, ['uid-x', 'uid-y']);
        expect(state.queue.default).toEqual(['uid-a', 'uid-y', 'uid-x', 'uid-b']);
    });
});

describe('applyAddToQueueNow', () => {
    it('replaces the queue in source order when shuffle is off', () => {
        const state = emptyState();
        registerQueueSongs(state, [song('a'), song('b'), song('c')]);
        applyAddToQueueNow(state, ['uid-a', 'uid-b', 'uid-c'], 'uid-b');
        expect(state.queue.default).toEqual(['uid-a', 'uid-b', 'uid-c']);
        expect(state.queue.unshuffled).toBeNull();
        expect(state.player.index).toBe(0);
    });

    it('shuffles the queue with the clicked track first when shuffle is on', () => {
        const state = emptyState();
        state.player.shuffle = PlayerShuffle.TRACK;
        registerQueueSongs(state, [song('a'), song('b'), song('c')]);
        applyAddToQueueNow(state, ['uid-a', 'uid-b', 'uid-c'], 'uid-b');
        expect(state.queue.default).toEqual(['uid-b', 'uid-c', 'uid-a']);
        expect(state.queue.unshuffled).toEqual(['uid-a', 'uid-b', 'uid-c']);
        expect(state.player.index).toBe(0);
    });
});

describe('applyAddToQueueShuffle', () => {
    it('replaces the queue with the shuffled order', () => {
        const state = emptyState();
        registerQueueSongs(state, [song('a'), song('b')]);
        applyAddToQueueShuffle(state, ['uid-b', 'uid-a'], ['uid-a', 'uid-b']);
        expect(state.queue.default).toEqual(['uid-b', 'uid-a']);
        expect(state.queue.unshuffled).toBeNull();
    });

    it('remembers the source order when shuffle is on so it can be restored', () => {
        const state = emptyState();
        state.player.shuffle = PlayerShuffle.TRACK;
        registerQueueSongs(state, [song('a'), song('b')]);
        applyAddToQueueShuffle(state, ['uid-b', 'uid-a'], ['uid-a', 'uid-b']);
        expect(state.queue.default).toEqual(['uid-b', 'uid-a']);
        expect(state.queue.unshuffled).toEqual(['uid-a', 'uid-b']);
    });
});

describe('applyShuffleQueue / applyUnshuffleQueue', () => {
    const queued = (ids: string[], index: number): PlayerQueueMutationState => ({
        player: { index, shuffle: PlayerShuffle.TRACK },
        queue: { default: [...ids], songs: {}, unshuffled: null },
    });

    it('reorders the queue itself and keeps the playing track playing', () => {
        const state = queued(['a', 'b', 'c', 'd'], 2);

        applyShuffleQueue(state);

        expect(state.queue.default[0]).toBe('c');
        expect(state.player.index).toBe(0);
        expect([...state.queue.default].sort()).toEqual(['a', 'b', 'c', 'd']);
        expect(state.queue.unshuffled).toEqual(['a', 'b', 'c', 'd']);
    });

    it('puts the queue back and follows the playing track when shuffle goes off', () => {
        const state = queued(['a', 'b', 'c', 'd'], 2);

        applyShuffleQueue(state);
        applyUnshuffleQueue(state);

        expect(state.queue.default).toEqual(['a', 'b', 'c', 'd']);
        expect(state.player.index).toBe(2);
        expect(state.queue.unshuffled).toBeNull();
    });

    it('keeps the original order as the restore point when re-shuffling', () => {
        const state = queued(['a', 'b', 'c', 'd'], 0);

        applyShuffleQueue(state);
        applyShuffleQueue(state, { keepRestorePoint: true });
        applyUnshuffleQueue(state);

        expect(state.queue.default).toEqual(['a', 'b', 'c', 'd']);
    });

    it('restores an order that tracks were added to and removed from while shuffled', () => {
        const state = queued(['a', 'b', 'c'], 0);

        applyShuffleQueue(state);
        state.queue.default = state.queue.default.filter((id) => id !== 'b');
        state.queue.default.push('x');
        state.player.index = 0;

        applyUnshuffleQueue(state);

        expect(state.queue.default).toEqual(['a', 'c', 'x']);
    });

    it('leaves an empty queue alone', () => {
        const state = queued([], -1);

        applyShuffleQueue(state);

        expect(state.queue.default).toEqual([]);
        expect(state.queue.unshuffled).toBeNull();
        expect(state.player.index).toBe(-1);
    });
});

afterEach(() => {
    vi.clearAllMocks();
});

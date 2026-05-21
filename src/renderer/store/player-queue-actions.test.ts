import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueueSong } from '/@/shared/types/domain-types';
import { PlayerShuffle } from '/@/shared/types/types';

import {
    applyAddToQueueLast,
    applyAddToQueueNext,
    applyAddToQueueNow,
    applyAddToQueueShuffle,
    registerQueueSongs,
    type PlayerQueueMutationState,
} from './player-queue-actions';

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
    queue: { default: [], shuffled: [], songs: {} },
});

describe('registerQueueSongs + applyAddToQueueLast', () => {
    it('appends track ids to the default queue', () => {
        const state = emptyState();
        const items = [song('a'), song('b')];
        const ids = registerQueueSongs(state, items);
        applyAddToQueueLast(state, ids);
        expect(state.queue.default).toEqual(['uid-a', 'uid-b']);
        expect(Object.keys(state.queue.songs)).toHaveLength(2);
    });

    it('extends shuffled index map when track shuffle is on', () => {
        const state = emptyState();
        state.player.shuffle = PlayerShuffle.TRACK;
        state.queue.default = ['uid-existing'];
        state.queue.shuffled = [0];
        const ids = registerQueueSongs(state, [song('n')]);
        applyAddToQueueLast(state, ids);
        expect(state.queue.default).toEqual(['uid-existing', 'uid-n']);
        expect(state.queue.shuffled).toEqual([0, 1]);
    });
});

describe('applyAddToQueueNext', () => {
    it('inserts after the current index when shuffle is off', () => {
        const state = emptyState();
        state.queue.default = ['uid-a', 'uid-b'];
        state.player.index = 0;
        registerQueueSongs(state, [song('x')]);
        applyAddToQueueNext(state, ['uid-x']);
        expect(state.queue.default).toEqual(['uid-a', 'uid-x', 'uid-b']);
    });
});

describe('applyAddToQueueNow', () => {
    it('replaces the queue and pins the target song first when shuffled', () => {
        const state = emptyState();
        state.player.shuffle = PlayerShuffle.TRACK;
        registerQueueSongs(state, [song('a'), song('b'), song('c')]);
        applyAddToQueueNow(state, ['uid-a', 'uid-b', 'uid-c'], 'uid-b');
        expect(state.queue.default).toEqual(['uid-a', 'uid-b', 'uid-c']);
        expect(state.queue.shuffled[0]).toBe(1);
        expect(state.player.index).toBe(0);
    });
});

describe('applyAddToQueueShuffle', () => {
    it('replaces the queue with a shuffled order and rebuilds shuffled indexes', () => {
        const state = emptyState();
        registerQueueSongs(state, [song('a'), song('b')]);
        applyAddToQueueShuffle(state, ['uid-b', 'uid-a']);
        expect(state.queue.default).toEqual(['uid-b', 'uid-a']);
        expect(state.queue.shuffled).toHaveLength(2);
    });
});

afterEach(() => {
    vi.clearAllMocks();
});

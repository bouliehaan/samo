import { describe, expect, it } from 'vitest';

import {
    computePlayerData,
    getPlaybackInputs,
    getQueueFromState,
    getQueueOrderFromState,
    isFirstTrackInQueueFromState,
    isLastTrackInQueueFromState,
    playbackInputsEqual,
} from './player-derived';

import { QueueSong } from '/@/shared/types/domain-types';
import { PlayerRepeat, PlayerShuffle, PlayerStatus } from '/@/shared/types/types';

const song = (id: string, uniqueId: string): QueueSong =>
    ({
        _uniqueId: uniqueId,
        id,
        name: id,
    }) as QueueSong;

describe('computePlayerData', () => {
    it('returns empty playback when index is unset', () => {
        const data = computePlayerData({
            player: {
                index: -1,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PAUSED,
            },
            queue: { default: [], shuffled: [], songs: {} },
        });

        expect(data.currentSong).toBeUndefined();
        expect(data.queueLength).toBe(0);
    });

    it('maps shuffle position to queue index for current and next', () => {
        const s0 = song('0', 'u0');
        const s1 = song('1', 'u1');
        const s2 = song('2', 'u2');

        const data = computePlayerData({
            player: {
                index: 1,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.TRACK,
                status: PlayerStatus.PLAYING,
            },
            queue: {
                default: ['u0', 'u1', 'u2'],
                shuffled: [2, 0, 1],
                songs: { u0: s0, u1: s1, u2: s2 },
            },
        });

        expect(data.currentSong?.id).toBe('0');
        expect(data.nextSong?.id).toBe('1');
        expect(data.index).toBe(0);
    });
});

describe('getQueueOrderFromState', () => {
    it('returns display order from default ids', () => {
        const s0 = song('0', 'u0');
        const s1 = song('1', 'u1');
        const queue = getQueueOrderFromState({
            player: {
                index: 0,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PLAYING,
            },
            queue: {
                default: ['u1', 'u0'],
                shuffled: [],
                songs: { u0: s0, u1: s1 },
            },
        });

        expect(queue.items.map((item) => item.id)).toEqual(['1', '0']);
        expect(queue.groups).toEqual([{ count: 2, name: 'All' }]);
    });
});

describe('getQueueFromState', () => {
    it('groups items when groupBy is provided', () => {
        const s0 = { ...song('0', 'u0'), album: 'Alpha' } as QueueSong;
        const s1 = { ...song('1', 'u1'), album: 'Alpha' } as QueueSong;
        const s2 = { ...song('2', 'u2'), album: 'Beta' } as QueueSong;

        const queue = getQueueFromState(
            {
                player: {
                    index: 0,
                    playerNum: 1,
                    repeat: PlayerRepeat.NONE,
                    shuffle: PlayerShuffle.NONE,
                    status: PlayerStatus.PLAYING,
                },
                queue: {
                    default: ['u0', 'u1', 'u2'],
                    shuffled: [],
                    songs: { u0: s0, u1: s1, u2: s2 },
                },
            },
            'album',
        );

        expect(queue.groups).toEqual([
            { count: 2, name: 'Alpha' },
            { count: 1, name: 'Beta' },
        ]);
    });
});

describe('queue position helpers', () => {
    it('detects first and last playback index', () => {
        const state = {
            player: {
                index: 0,
                playerNum: 1 as const,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PLAYING,
            },
            queue: {
                default: ['u0', 'u1'],
                shuffled: [],
                songs: { u0: song('0', 'u0'), u1: song('1', 'u1') },
            },
        };

        expect(isFirstTrackInQueueFromState(state)).toBe(true);
        expect(isLastTrackInQueueFromState(state)).toBe(false);

        state.player.index = 1;
        expect(isFirstTrackInQueueFromState(state)).toBe(false);
        expect(isLastTrackInQueueFromState(state)).toBe(true);
    });
});

describe('playbackInputsEqual', () => {
    it('detects when the current track changes at the same index', () => {
        const base = getPlaybackInputs({
            player: {
                index: 0,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PLAYING,
            },
            queue: {
                default: ['u0'],
                shuffled: [],
                songs: { u0: song('a', 'u0') },
            },
        });

        const replaced = getPlaybackInputs({
            player: {
                index: 0,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PLAYING,
            },
            queue: {
                default: ['u1'],
                shuffled: [],
                songs: { u1: song('b', 'u1') },
            },
        });

        expect(playbackInputsEqual(base, replaced)).toBe(false);
    });

    it('detects queue revision bumps', () => {
        const base = getPlaybackInputs({
            player: {
                index: 0,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PLAYING,
            },
            queue: { default: ['u0'], revision: 0, shuffled: [], songs: {} },
        });

        const bumped = getPlaybackInputs({
            player: {
                index: 0,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PLAYING,
            },
            queue: { default: ['u0'], revision: 1, shuffled: [], songs: {} },
        });

        expect(playbackInputsEqual(base, bumped)).toBe(false);
    });
});

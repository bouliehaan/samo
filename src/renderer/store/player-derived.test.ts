import { describe, expect, it } from 'vitest';

import { computePlayerData, getPlaybackInputs, playbackInputsEqual } from './player-derived';
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

describe('playbackInputsEqual', () => {
    it('detects queue revision bumps', () => {
        const base = getPlaybackInputs({
            player: {
                index: 0,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PLAYING,
            },
            queue: { default: ['u0'], shuffled: [], songs: {}, revision: 0 },
        });

        const bumped = getPlaybackInputs({
            player: {
                index: 0,
                playerNum: 1,
                repeat: PlayerRepeat.NONE,
                shuffle: PlayerShuffle.NONE,
                status: PlayerStatus.PLAYING,
            },
            queue: { default: ['u0'], shuffled: [], songs: {}, revision: 1 },
        });

        expect(playbackInputsEqual(base, bumped)).toBe(false);
    });
});

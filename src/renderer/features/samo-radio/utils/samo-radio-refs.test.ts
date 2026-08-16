import { describe, expect, it } from 'vitest';

import {
    samoRadioQueueForSend,
    samoRadioRefForItem,
    samoRadioRefForSong,
} from '/@/renderer/features/samo-radio/utils/samo-radio-refs';

const song = (id: string, serverId = 'samo') => ({ _serverId: serverId, id });

describe('samoRadioRefForSong', () => {
    it('maps a track from the connected server', () => {
        expect(samoRadioRefForSong(song('track_1'), 'samo')).toEqual({
            id: 'track_1',
            type: 'track',
        });
    });

    it('refuses a track issued by a different server', () => {
        expect(samoRadioRefForSong(song('track_1', 'other'), 'samo')).toBeNull();
    });

    it('refuses everything when no server is connected', () => {
        expect(samoRadioRefForSong(song('track_1'), null)).toBeNull();
    });
});

describe('samoRadioQueueForSend', () => {
    it('keeps the start index pointing at the same track after drops', () => {
        const queue = [song('a'), song('b', 'other'), song('c'), song('d')];

        // 'c' is at position 2 in the original queue but 1 in the sent one.
        expect(samoRadioQueueForSend(queue, 2, 'samo')).toEqual({
            items: [
                { id: 'a', type: 'track' },
                { id: 'c', type: 'track' },
                { id: 'd', type: 'track' },
            ],
            startIndex: 1,
        });
    });

    it('starts at the next surviving item when the current one is dropped', () => {
        const queue = [song('a'), song('b', 'other'), song('c')];

        expect(samoRadioQueueForSend(queue, 1, 'samo').startIndex).toBe(1);
    });

    it('sends nothing when the whole queue belongs elsewhere', () => {
        const queue = [song('a', 'other'), song('b', 'other')];

        expect(samoRadioQueueForSend(queue, 0, 'samo')).toEqual({ items: [], startIndex: 0 });
    });

    it('treats a negative index as the top of the queue', () => {
        expect(samoRadioQueueForSend([song('a'), song('b')], -3, 'samo').startIndex).toBe(0);
    });
});

describe('samoRadioRefForItem', () => {
    it('sends an audiobook as one id the server expands', () => {
        expect(samoRadioRefForItem({ id: 'book_1' }, 'audiobook', true)).toEqual({
            id: 'book_1',
            type: 'audiobook',
        });
    });

    it('refuses an item this server does not own', () => {
        expect(samoRadioRefForItem({ id: 'book_1' }, 'audiobook', false)).toBeNull();
    });
});

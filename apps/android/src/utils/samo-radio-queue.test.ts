import { describe, expect, it } from 'vitest';

import {
    samoRadioQueueForSend,
    samoRadioRefFromPlayable,
    samoRadioStationRefFromPlayable,
} from './samo-radio-queue';

// Real playback ids, in the grammar the item builders actually emit
// (`${type}:${url}:${kind}:${id}`). Hand-written shapes would let this file go
// green against a mapper that cannot read anything the app produces — which is
// exactly what happened when it asserted on samoProgressTargetId, a field the
// queue store never carries.
const SERVER = 'samo:https://music.example';

describe('samoRadioRefFromPlayable', () => {
    it('reads the catalog id out of a music playback id', () => {
        expect(
            samoRadioRefFromPlayable({ id: `${SERVER}:music:track_1`, source: 'music' }),
        ).toEqual({ id: 'track_1', type: 'track' });
    });

    it('reads the episode id out of a podcast playback id', () => {
        // Podcast ids carry the show as well: `…:podcast:<showId>:<episodeId>`.
        expect(
            samoRadioRefFromPlayable({
                id: `${SERVER}:podcast:show_1:ep_7`,
                source: 'podcast',
            }),
        ).toEqual({ id: 'ep_7', type: 'episode' });
    });

    // A multi-file audiobook plays one file at a time but is addressed by the
    // BOOK id, so the trailing `:file:<mediaFileId>` must be ignored.
    it('reads the book id, not the file id, out of an audiobook playback id', () => {
        expect(
            samoRadioRefFromPlayable({
                id: `${SERVER}:audiobook:book_1:file:media_9`,
                source: 'audiobook',
            }),
        ).toEqual({ id: 'book_1', type: 'audiobook' });
        expect(
            samoRadioRefFromPlayable({ id: `${SERVER}:audiobook:book_2`, source: 'audiobook' }),
        ).toEqual({ id: 'book_2', type: 'audiobook' });
    });

    it('prefers the station id a radio item carries, and parses it when absent', () => {
        expect(
            samoRadioRefFromPlayable({
                id: `${SERVER}:internet-radio:station_3`,
                radioStationId: 'station_3',
                source: 'radio',
            }),
        ).toEqual({ id: 'station_3', type: 'station' });
        // Rehydrated from the native mirror: the field is gone, the id is not.
        expect(
            samoRadioRefFromPlayable({
                id: `${SERVER}:internet-radio:station_4`,
                source: 'radio',
            }),
        ).toEqual({ id: 'station_4', type: 'station' });
    });

    // Programmed stations are a different catalog from internet ones, and the
    // server resolves them under a different type. Sending one as the other
    // either misses or plays somebody else's station, since the two id spaces
    // are free to collide.
    it('maps a programmed station to the programmed radio type', () => {
        expect(
            samoRadioRefFromPlayable({
                id: 'samo:radio-programmed:chan_2',
                source: 'radio',
            }),
        ).toEqual({ id: 'chan_2', type: 'radio' });
    });

    // Anything the server cannot resolve by id must be dropped rather than
    // sent, or the device is asked to fetch something that does not exist.
    it('returns null when there is no resolvable catalog id', () => {
        expect(samoRadioRefFromPlayable({ id: 'file:///sdcard/x.mp3', source: 'music' })).toBeNull();
        expect(samoRadioRefFromPlayable({ id: `${SERVER}:music:t1`, source: 'radio' })).toBeNull();
    });

    // A channel is a broadcast, not a queue item: the server rejects a channel
    // id in a queue, and passing one through as an internet station id would
    // tune the stereo to a different station or to nothing.
    it('refuses to send a channel as a queue item', () => {
        expect(
            samoRadioRefFromPlayable({
                id: `${SERVER}:channel:jake`,
                radioChannelId: 'jake',
                source: 'radio',
            }),
        ).toBeNull();
        // Rehydrated from the native mirror: the field is gone, the id is not.
        expect(
            samoRadioRefFromPlayable({ id: `${SERVER}:channel:jake`, source: 'radio' }),
        ).toBeNull();
    });
});

describe('samoRadioStationRefFromPlayable', () => {
    it('turns a channel into something the device is tuned to', () => {
        expect(
            samoRadioStationRefFromPlayable({
                id: `${SERVER}:channel:jake`,
                radioChannelId: 'jake',
                radioStationName: 'Jake',
                source: 'radio',
            }),
        ).toEqual({ id: 'jake', kind: 'channel', name: 'Jake' });
    });

    it('leaves everything else to the queue path', () => {
        // An internet station resolves as an ordinary queue item, so tuning is
        // not its route — offering both would be two ways to do one thing.
        expect(
            samoRadioStationRefFromPlayable({
                id: `${SERVER}:internet-radio:station_3`,
                radioStationId: 'station_3',
                source: 'radio',
            }),
        ).toBeNull();
        expect(
            samoRadioStationRefFromPlayable({ id: `${SERVER}:music:track_1`, source: 'music' }),
        ).toBeNull();
    });
});

describe('samoRadioQueueForSend', () => {
    const queue = [
        { id: `${SERVER}:music:track_1`, source: 'music' as const },
        { id: 'local-only', source: 'music' as const },
        { id: `${SERVER}:music:track_2`, source: 'music' as const },
        { id: `${SERVER}:podcast:show_1:ep_3`, source: 'podcast' as const },
    ];

    it('keeps order and drops what cannot be sent', () => {
        expect(samoRadioQueueForSend(queue, 0).items).toEqual([
            { id: 'track_1', type: 'track' },
            { id: 'track_2', type: 'track' },
            { id: 'ep_3', type: 'episode' },
        ]);
    });

    // The whole point: dropping entry 1 renumbers everything after it, so the
    // queue's own index would start the device on the wrong track.
    it('rebases the start index across dropped entries', () => {
        expect(samoRadioQueueForSend(queue, 2).startIndex).toBe(1);
        expect(samoRadioQueueForSend(queue, 3).startIndex).toBe(2);
        expect(samoRadioQueueForSend(queue, 0).startIndex).toBe(0);
    });

    // If the item playing right now is itself unsendable, start at the next one
    // that survived rather than jumping back to the top of the queue.
    it('falls forward when the current item was dropped', () => {
        expect(samoRadioQueueForSend(queue, 1).startIndex).toBe(1);
    });

    it('handles an empty queue and an out-of-range index', () => {
        expect(samoRadioQueueForSend([], 0)).toEqual({ items: [], startIndex: 0 });
        expect(samoRadioQueueForSend(queue, 99).startIndex).toBe(0);
    });
});

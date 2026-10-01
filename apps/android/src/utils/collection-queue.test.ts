import {
    type MobileMediaTrack,
    MobileMediaDetailType,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCollectionQueueItems } from './collection-queue';
import { insertQueueItems } from './queue-edits';

const track = (id: string, source: MobilePlayableAudio['source'] = 'music'): MobileMediaTrack => ({
    id,
    title: id,
    playback: {
        id,
        quality: {
            deliveryKind: 'android-direct',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        source,
        title: id,
        url: `https://example.com/${id}`,
    },
});
const tracks = [track('oldest'), track('middle'), track('newest')];
const playlist = { tracks, type: MobileMediaDetailType.PLAYLIST };
const ids = (items: MobilePlayableAudio[]) => items.map((item) => item.id);

afterEach(() => vi.restoreAllMocks());

describe('collection queue order', () => {
    it.each(['next', 'end'] as const)('queues playlists newest first at %s', (placement) => {
        const existing = [
            track('history').playback!,
            track('current').playback!,
            track('later').playback!,
        ];
        const queue = { index: 1, items: existing };
        const result = insertQueueItems(queue, buildCollectionQueueItems(playlist), placement);

        expect(ids(result.items)).toEqual(
            placement === 'next'
                ? ['history', 'current', 'newest', 'middle', 'oldest', 'later']
                : ['history', 'current', 'later', 'newest', 'middle', 'oldest'],
        );
        expect(result.index).toBe(1);
        expect(result.items[result.index]).toBe(existing[1]);
        expect(ids(existing)).toEqual(['history', 'current', 'later']);
        expect(tracks.map((item) => item.id)).toEqual(['oldest', 'middle', 'newest']);
    });

    it('preserves album track order', () => {
        expect(
            ids(buildCollectionQueueItems({ tracks, type: MobileMediaDetailType.ALBUM })),
        ).toEqual(['oldest', 'middle', 'newest']);
    });

    it.each(['next', 'end'] as const)('shuffles only the inserted block at %s', (placement) => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const existing = [track('current').playback!, track('later').playback!];
        const result = insertQueueItems(
            { index: 0, items: existing },
            buildCollectionQueueItems(playlist, true),
            placement,
        );

        expect(ids(result.items)).toEqual(
            placement === 'next'
                ? ['current', 'middle', 'oldest', 'newest', 'later']
                : ['current', 'later', 'middle', 'oldest', 'newest'],
        );
        expect(result.index).toBe(0);
        expect(ids(existing)).toEqual(['current', 'later']);
        expect(tracks.map((item) => item.id)).toEqual(['oldest', 'middle', 'newest']);
    });

    it('shuffles albums when requested', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(
            ids(buildCollectionQueueItems({ tracks, type: MobileMediaDetailType.ALBUM }, true)),
        ).toEqual(['middle', 'newest', 'oldest']);
    });

    it('skips unavailable tracks and radio while preserving duplicate entries', () => {
        expect(
            ids(
                buildCollectionQueueItems({
                    type: MobileMediaDetailType.PLAYLIST,
                    tracks: [
                        tracks[0]!,
                        { id: 'missing', title: 'missing' },
                        track('live', 'radio'),
                        tracks[2]!,
                        tracks[0]!,
                    ],
                }),
            ),
        ).toEqual(['oldest', 'newest', 'oldest']);
    });

    it('handles empty and single-track collections', () => {
        expect(buildCollectionQueueItems({ ...playlist, tracks: [] }, true)).toEqual([]);
        expect(ids(buildCollectionQueueItems({ ...playlist, tracks: [tracks[0]!] }, true))).toEqual(
            ['oldest'],
        );
    });
});

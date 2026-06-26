import { type MobilePlayableAudio } from '@samo/core/mobile';
import { describe, expect, it } from 'vitest';

import { shouldMirrorPlaybackQueueToNative } from './playback-queue-mirror';

const item = (source: string, url = `https://samo/${source}`): MobilePlayableAudio =>
    ({ id: source, source, title: source, url }) as unknown as MobilePlayableAudio;

describe('shouldMirrorPlaybackQueueToNative', () => {
    // The bug: asleep on a podcast with internet radio queued next, the queue
    // never advanced — native (the only advancer with the app backgrounded) had
    // an empty mirror because radio anywhere refused the whole queue.
    it('mirrors podcast → radio so native can advance into radio while asleep', () => {
        expect(
            shouldMirrorPlaybackQueueToNative({ index: 0, items: [item('podcast'), item('radio')] }),
        ).toBe(true);
    });

    it('does NOT mirror when radio is the CURRENT item (no advancing out of live)', () => {
        expect(
            shouldMirrorPlaybackQueueToNative({ index: 0, items: [item('radio'), item('podcast')] }),
        ).toBe(false);
    });

    it('does not mirror a single-item queue', () => {
        expect(shouldMirrorPlaybackQueueToNative({ index: 0, items: [item('podcast')] })).toBe(false);
    });

    it('mirrors a normal multi-track music queue', () => {
        expect(
            shouldMirrorPlaybackQueueToNative({ index: 0, items: [item('music'), item('music')] }),
        ).toBe(true);
    });

    it('does not mirror a single-file audiobook split into same-URL chapter rows', () => {
        expect(
            shouldMirrorPlaybackQueueToNative({
                index: 0,
                items: [item('audiobook', 'one-file'), item('audiobook', 'one-file')],
            }),
        ).toBe(false);
    });
});

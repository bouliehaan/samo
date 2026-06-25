import { describe, expect, it } from 'vitest';
import type { MobilePlayableAudio } from '@samo/core/mobile';

import { mergePreparedQueueItem } from './playback-resume';

const baseItem = (overrides: Partial<MobilePlayableAudio> = {}): MobilePlayableAudio => ({
    id: 'samo:https://samo:music:track-1',
    quality: {
        deliveryKind: 'unknown',
        losslessRequired: false,
        serverTranscodeRequested: false,
    },
    source: 'music',
    title: 'Track One',
    url: 'https://samo/api/v1/music/tracks/track-1/stream?stream_token=old',
    ...overrides,
});

describe('mergePreparedQueueItem', () => {
    it('adopts refreshed URLs without inheriting the session start position', () => {
        // The regression this locks: a mid-track recovery restart prepared the
        // item with initialPositionSeconds=10 and wrote it back into the queue
        // slot — after which EVERY entry into that slot (native auto-advance,
        // lock-screen skip, Prev) started the song 10 seconds in.
        const original = baseItem();
        const prepared = baseItem({
            artworkUrl: 'https://samo/api/v1/music/albums/a1/cover?stream_token=fresh',
            initialPositionSeconds: 10,
            url: 'https://samo/api/v1/music/tracks/track-1/stream?stream_token=fresh',
        });

        const merged = mergePreparedQueueItem(original, prepared);

        expect(merged.url).toBe(prepared.url);
        expect(merged.artworkUrl).toBe(prepared.artworkUrl);
        expect(merged.initialPositionSeconds).toBeUndefined();
    });

    it('keeps the build-time resume the queue slot was created with', () => {
        // Podcast/audiobook slots legitimately carry a resume point from queue
        // build time; a session-level refresh must not clobber it (the slot is
        // durable, the session position is transient).
        const original = baseItem({
            initialPositionSeconds: 1700,
            source: 'podcast',
        });
        const prepared = baseItem({
            initialPositionSeconds: 1800,
            source: 'podcast',
            url: 'https://samo/api/v1/podcasts/episodes/e1/stream?stream_token=fresh',
        });

        const merged = mergePreparedQueueItem(original, prepared);

        expect(merged.initialPositionSeconds).toBe(1700);
        expect(merged.url).toBe(prepared.url);
    });

    it('returns the prepared item untouched when start positions already agree', () => {
        const original = baseItem({ initialPositionSeconds: 42 });
        const prepared = baseItem({
            initialPositionSeconds: 42,
            url: 'https://samo/api/v1/music/tracks/track-1/stream?stream_token=fresh',
        });

        expect(mergePreparedQueueItem(original, prepared)).toBe(prepared);
    });

    it('strips a transient resume even when the original never had one', () => {
        const original = baseItem();
        const prepared = baseItem({ initialPositionSeconds: 130 });

        const merged = mergePreparedQueueItem(original, prepared);

        expect('initialPositionSeconds' in merged).toBe(false);
    });
});

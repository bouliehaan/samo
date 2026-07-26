import { type MobilePlayableAudio } from '@samo/core/mobile';
import { describe, expect, it } from 'vitest';

import { type AndroidPlaybackState } from '../types/playback';
import { getPlaybackDurationMs, getSeekSegments } from './playback-time';

/**
 * A 40-hour book ripped one chapter per file. The player is inside file 4 of
 * 240; the file is 10 minutes long and starts 30 minutes into the book.
 */
const bookItem = (over: Partial<MobilePlayableAudio> = {}): MobilePlayableAudio =>
    ({
        durationSeconds: 600,
        id: 'samo:https://s:audiobook:book-1:file:f-4',
        progressOffsetSeconds: 1800,
        quality: { deliveryKind: 'android-direct', losslessRequired: false, serverTranscodeRequested: false },
        source: 'audiobook',
        timelineDurationSeconds: 144_000,
        timelineSegments: [
            { durationSeconds: 600, id: 'c1', startSeconds: 0, title: 'One' },
            { durationSeconds: 600, id: 'c2', startSeconds: 600, title: 'Two' },
            { durationSeconds: 143_400 - 600, id: 'c3', startSeconds: 1200, title: 'Three' },
        ],
        title: 'The Long Book',
        url: 'https://s/api/v1/audiobooks/book-1/stream?mediaFileId=f-4',
        ...over,
    }) as unknown as MobilePlayableAudio;

const playing = (item: MobilePlayableAudio, durationMs?: number): AndroidPlaybackState =>
    ({
        // Native reports the FILE's length; that's what end-detection needs.
        durationMs: durationMs ?? 600_000,
        item,
        positionMs: 120_000,
        status: 'playing',
    }) as unknown as AndroidPlaybackState;

describe('getPlaybackDurationMs for a multi-file audiobook', () => {
    it('spans the whole book, not the file currently streaming', () => {
        // The regression: this returned 600_000 (one file), so a 40-hour book
        // drew a ~10-minute bar. Since the bar maps a tap to
        // `fraction * durationMs`, every chapter tap landed inside the first
        // file and drifted further off the deeper into the book you were.
        expect(getPlaybackDurationMs(playing(bookItem()))).toBe(144_000_000);
    });

    it('agrees with the range the book-global chapter markers occupy', () => {
        const item = bookItem();
        const durationMs = getPlaybackDurationMs(playing(item))!;
        const segments = getSeekSegments(item.timelineSegments, durationMs);
        const lastSegment = segments[segments.length - 1]!;
        const segmentsEnd = lastSegment.startSeconds + (lastSegment.durationSeconds ?? 0);

        // Markers must fit inside the bar. Against the old per-file duration the
        // chapters ran ~240x past its end.
        expect(segmentsEnd * 1000).toBeLessThanOrEqual(durationMs);
    });

    it('falls back to the stream length when no timeline duration was threaded', () => {
        const { timelineDurationSeconds: _absent, ...legacy } = bookItem();
        expect(getPlaybackDurationMs(playing(legacy as MobilePlayableAudio))).toBe(600_000);
    });

    it('is unchanged for a single-file book (file length == book length)', () => {
        const single = bookItem({
            durationSeconds: 28_260,
            progressOffsetSeconds: 0,
            timelineDurationSeconds: 28_260,
        });
        expect(getPlaybackDurationMs(playing(single, 28_260_000))).toBe(28_260_000);
    });
});

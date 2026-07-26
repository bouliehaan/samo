import { describe, expect, it } from 'vitest';
import { ServerType } from '@samo/core/server';
import { type MobilePlayableAudio } from '@samo/core/mobile';

import {
    getSamoBookPositionSeconds,
    getSamoFileBookSpanSeconds,
    getSamoFilePositionMs,
    isMp3PlayableAudio,
    resolveAudiobookSeekTarget,
    shouldServerSeekAudiobookMp3,
} from './samo-audiobook-playback';

const makeItem = (over: Partial<MobilePlayableAudio> = {}): MobilePlayableAudio =>
    ({
        id: `${ServerType.SAMO}:audiobook:book1:file:f1`,
        source: 'audiobook',
        title: '10% Happier',
        url: 'http://host/api/v1/audiobooks/book1/stream',
        mimeType: 'audio/mpeg',
        durationSeconds: 28260,
        progressOffsetSeconds: 0,
        ...over,
    }) as unknown as MobilePlayableAudio;

describe('isMp3PlayableAudio', () => {
    it('is true for audio/mpeg', () => {
        expect(isMp3PlayableAudio(makeItem({ mimeType: 'audio/mpeg' }))).toBe(true);
    });
    it('is false for an m4b (audio/mp4)', () => {
        expect(isMp3PlayableAudio(makeItem({ mimeType: 'audio/mp4' }))).toBe(false);
    });
    it('is false when the mime type is unknown (stay on the safe native path)', () => {
        expect(isMp3PlayableAudio(makeItem({ mimeType: undefined }))).toBe(false);
    });
});

describe('shouldServerSeekAudiobookMp3', () => {
    it('routes a Samo MP3 audiobook to the server seek', () => {
        expect(shouldServerSeekAudiobookMp3(makeItem())).toBe(true);
    });
    it('also routes multi-file MP3 rips (same book-absolute position shape)', () => {
        expect(shouldServerSeekAudiobookMp3(makeItem({ progressOffsetSeconds: 3600 }))).toBe(true);
    });
    it('leaves m4b on the native seek (exact sample table)', () => {
        expect(shouldServerSeekAudiobookMp3(makeItem({ mimeType: 'audio/mp4' }))).toBe(false);
    });
    it('does not touch non-audiobook playback', () => {
        expect(
            shouldServerSeekAudiobookMp3(
                makeItem({ source: 'music' as MobilePlayableAudio['source'] }),
            ),
        ).toBe(false);
    });
});

describe('resolveAudiobookSeekTarget (single file)', () => {
    it('maps a book second straight to a file position at offset 0', () => {
        const item = makeItem();
        const target = resolveAudiobookSeekTarget([item], 502.982);
        expect(target.queueIndex).toBe(0);
        expect(Math.round(target.bookPositionSeconds)).toBe(503);
        expect(Math.round(target.filePositionMs)).toBe(502982);
    });
});

describe('book-time <-> file-time round trip (multi-file)', () => {
    // File 4 of a chapter-per-file rip: 10 minutes long, starting 30 minutes in.
    const file = makeItem({ durationSeconds: 600, progressOffsetSeconds: 1800 });

    it('converts a book target to the file position the engine reports in', () => {
        // The seek bar hands over BOOK seconds; playbackState.positionMs is
        // FILE-relative. Optimistically painting the book value put the playhead
        // at book+offset (2100 -> displayed 3900) — a whole different chapter —
        // and the file-relative echo from native could never confirm it, so the
        // wrong value was held for the entire pending-seek grace.
        expect(getSamoFilePositionMs(file, 2100)).toBe(300_000);
        expect(getSamoBookPositionSeconds(file, 300_000)).toBe(2100);
    });

    it('reports the file span so a cross-file target can be told apart', () => {
        const span = getSamoFileBookSpanSeconds(file);
        expect(span).toEqual({ endSeconds: 2400, startSeconds: 1800 });
    });
});

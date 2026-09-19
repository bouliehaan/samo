import { describe, expect, it } from 'vitest';
import { ServerType } from '@samo/core/server';
import { type MobilePlayableAudio } from '@samo/core/mobile';

import {
    getAudiobookQueueItemBookId,
    getAudiobookQueueRun,
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
    it('routes a samo MP3 audiobook to the server seek', () => {
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

const song = (id: string): MobilePlayableAudio =>
    ({ id: `samo:https://s.example:music:${id}`, source: 'music', title: id }) as unknown as MobilePlayableAudio;

/** File `n` of a 4 x 600 s book, streamed or downloaded. */
const bookFile = (
    book: string,
    n: number,
    form: 'file' | 'offline' = 'file',
): MobilePlayableAudio =>
    makeItem({
        durationSeconds: 600,
        id: `samo:https://s.example:audiobook:${book}:${form}:f${n}`,
        progressOffsetSeconds: (n - 1) * 600,
        timelineDurationSeconds: 2400,
    });

describe('getAudiobookQueueItemBookId', () => {
    it('reads the book id from the streamed and the downloaded per-file forms', () => {
        expect(getAudiobookQueueItemBookId(bookFile('b1', 2))).toBe('b1');
        expect(getAudiobookQueueItemBookId(bookFile('b1', 2, 'offline'))).toBe('b1');
    });

    it('is undefined for anything that is not an audiobook', () => {
        expect(getAudiobookQueueItemBookId(song('m1'))).toBeUndefined();
    });
});

describe('getAudiobookQueueRun', () => {
    // song, book A (f1..f4), book B (f1), song
    const items = [
        song('m1'),
        bookFile('A', 1),
        bookFile('A', 2),
        bookFile('A', 3),
        bookFile('A', 4),
        bookFile('B', 1),
        song('m2'),
    ];

    it('spans the playing book and nothing else', () => {
        expect(getAudiobookQueueRun(items, 2)).toEqual({ end: 5, start: 1 });
        expect(getAudiobookQueueRun(items, 4)).toEqual({ end: 5, start: 1 });
        expect(getAudiobookQueueRun(items, 5)).toEqual({ end: 6, start: 5 });
    });

    it('is just the item for a song', () => {
        expect(getAudiobookQueueRun(items, 0)).toEqual({ end: 1, start: 0 });
    });

    it('is empty for an out-of-range index', () => {
        expect(getAudiobookQueueRun(items, 9)).toEqual({ end: 0, start: 0 });
    });
});

describe('resolveAudiobookSeekTarget (book inside a mixed queue)', () => {
    // Play Next of a book into a music queue: songs after the book.
    const items = [song('m1'), bookFile('A', 1), bookFile('A', 2), bookFile('A', 3), song('m2')];

    it('lands a forward scrub on the book file that holds it, not the song after the book', () => {
        // Playing file 1 (queue index 1); scrub to 25:00 = file 3 at 5:00.
        const target = resolveAudiobookSeekTarget(items, 1500, 1);
        expect(target.queueIndex).toBe(3);
        expect(target.filePositionMs).toBe(300_000);
    });

    it('lands a backward scrub on an earlier file of the same book', () => {
        const target = resolveAudiobookSeekTarget(items, 30, 3);
        expect(target.queueIndex).toBe(1);
        expect(target.filePositionMs).toBe(30_000);
    });

    it('never leaves the book for a target past its end', () => {
        const target = resolveAudiobookSeekTarget(items, 99_999, 2);
        expect(target.queueIndex).toBe(3);
    });

    it('clamps to the first queued file when the target is before it (book resumed mid-way)', () => {
        // Play Next of a half-read book queues only the files from the resume file on.
        const tail = [song('m1'), bookFile('A', 3), bookFile('A', 4)];
        const target = resolveAudiobookSeekTarget(tail, 100, 1);
        expect(target.queueIndex).toBe(1);
        expect(target.filePositionMs).toBe(0);
    });
});

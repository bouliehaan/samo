import { describe, expect, it } from 'vitest';

import { type SamoAudiobook } from '../server/server-samo';
import { ServerType } from '../server/server-types';
import { testServerAuthentication } from '../test-fixtures';
import {
    buildSamoAudiobookFileQueue,
    CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ,
    mimeFromAudioFileExt,
    needsChromecastCompatibleStream,
    parseSamoAudiobookIdFromPlaybackId,
    pickSamoAudiobookFileIndexForBookTime,
    samoAudiobookFilePlaybacks,
} from './mobile-playback';


describe('mimeFromAudioFileExt', () => {
    it('maps common extensions and strips a leading dot', () => {
        expect(mimeFromAudioFileExt('.flac')).toBe('audio/flac');
        expect(mimeFromAudioFileExt('m4b')).toBe('audio/mp4');
    });

    it('returns null for unknown extensions', () => {
        expect(mimeFromAudioFileExt('weird')).toBeNull();
    });
});


describe('needsChromecastCompatibleStream', () => {
    it('flags sample rates above the Cast FLAC ceiling', () => {
        expect(
            needsChromecastCompatibleStream({
                container: 'flac',
                deliveryKind: 'android-direct',
                losslessRequired: true,
                sampleRate: CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ + 1,
                serverTranscodeRequested: false,
            }),
        ).toBe(true);
    });

    it('leaves CD-rate lossless on the direct cast path', () => {
        expect(
            needsChromecastCompatibleStream({
                container: 'flac',
                deliveryKind: 'android-direct',
                losslessRequired: true,
                sampleRate: 44_100,
                serverTranscodeRequested: false,
            }),
        ).toBe(false);
    });
});


const samoAuth = () =>
    testServerAuthentication({ type: ServerType.SAMO, url: 'https://samo.example.com' });

const threeFileBook = (): SamoAudiobook => ({
    audioFiles: [
        { durationMs: 600_000, id: 'file-1', mimeType: 'audio/mpeg', startOffsetSeconds: 0 },
        { durationMs: 540_000, id: 'file-2', mimeType: 'audio/mpeg', startOffsetSeconds: 600 },
        { durationMs: 480_000, id: 'file-3', mimeType: 'audio/mpeg', startOffsetSeconds: 1140 },
    ],
    book: { authors: [{ id: 'a1', name: 'A. Writer' }], title: 'The Long Book' },
    chapters: [
        { index: 1, startSeconds: 0, title: 'One' },
        { index: 2, startSeconds: 700, title: 'Two' },
        { index: 3, startSeconds: 1300, title: 'Three' },
    ],
    durationSeconds: 1620,
    id: 'book-1',
});

describe('samoAudiobookFilePlaybacks', () => {
    it('preserves server-provided offsets', () => {
        const files = samoAudiobookFilePlaybacks(threeFileBook());
        expect(files.map((f) => f.startOffsetSeconds)).toEqual([0, 600, 1140]);
        expect(files.map((f) => f.mediaFileId)).toEqual(['file-1', 'file-2', 'file-3']);
    });

    it('carries each file mimeType so the MP3 frame-seek path can activate', () => {
        // Without this the Android queue items had mimeType=undefined and
        // shouldServerSeekAudiobookMp3 always returned false -> ExoPlayer's
        // coarse Xing seek -> chapter taps landed mid-sentence.
        const files = samoAudiobookFilePlaybacks(threeFileBook());
        expect(files.map((f) => f.mimeType)).toEqual(['audio/mpeg', 'audio/mpeg', 'audio/mpeg']);
    });

    it('back-fills offsets by accumulating durations when the server omits them', () => {
        const files = samoAudiobookFilePlaybacks({
            audioFiles: [
                { durationMs: 600_000, id: 'a' },
                { durationMs: 540_000, id: 'b' },
            ],
            id: 'x',
        } as SamoAudiobook);
        expect(files.map((f) => f.startOffsetSeconds)).toEqual([0, 600]);
    });
});

describe('pickSamoAudiobookFileIndexForBookTime', () => {
    const files = samoAudiobookFilePlaybacks(threeFileBook());
    it('maps a book second to the file whose span contains it', () => {
        expect(pickSamoAudiobookFileIndexForBookTime(files, 0)).toBe(0);
        expect(pickSamoAudiobookFileIndexForBookTime(files, 599)).toBe(0);
        expect(pickSamoAudiobookFileIndexForBookTime(files, 600)).toBe(1);
        expect(pickSamoAudiobookFileIndexForBookTime(files, 1139)).toBe(1);
        expect(pickSamoAudiobookFileIndexForBookTime(files, 1140)).toBe(2);
        expect(pickSamoAudiobookFileIndexForBookTime(files, 99999)).toBe(2);
    });
});

describe('buildSamoAudiobookFileQueue', () => {
    it('builds one whole-file playable per file, each with its book-global offset', () => {
        const queue = buildSamoAudiobookFileQueue(samoAuth(), threeFileBook(), {
            bookStartSeconds: 0,
        });
        expect(queue).not.toBeNull();
        expect(queue!.items).toHaveLength(3);
        // Each url targets a specific whole file; none carries a progress/offset.
        for (const item of queue!.items) {
            expect(item.url).toContain('mediaFileId=');
            expect(item.url).not.toContain('progressSeconds=');
            expect(item.url).not.toContain('offsetSeconds=');
            expect(item.source).toBe('audiobook');
            // The queue item must carry mimeType for the MP3 server-seek gate.
            expect(item.mimeType).toBe('audio/mpeg');
        }
        expect(queue!.items.map((i) => i.progressOffsetSeconds)).toEqual([0, 600, 1140]);
        // Per-file native durations, not the whole-book duration.
        expect(queue!.items.map((i) => i.durationSeconds)).toEqual([600, 540, 480]);
    });

    it('selects the resume file and sets the in-file initial position', () => {
        // 700s book time is 100s into file-2 ([600,1140)).
        const queue = buildSamoAudiobookFileQueue(samoAuth(), threeFileBook(), {
            bookStartSeconds: 700,
        });
        expect(queue!.index).toBe(1);
        expect(queue!.items[1]!.initialPositionSeconds).toBe(100);
        expect(queue!.items[0]!.initialPositionSeconds).toBe(0);
        expect(queue!.items[2]!.initialPositionSeconds).toBe(0);
    });

    it('keeps the book id parseable from the per-file playback id', () => {
        const queue = buildSamoAudiobookFileQueue(samoAuth(), threeFileBook(), {
            bookStartSeconds: 0,
        });
        expect(parseSamoAudiobookIdFromPlaybackId(queue!.items[0]!.id)).toBe('book-1');
        expect(parseSamoAudiobookIdFromPlaybackId(queue!.items[2]!.id)).toBe('book-1');
    });
});

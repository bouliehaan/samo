import { describe, expect, it } from 'vitest';

import { testServerAuthentication } from '../test-fixtures';
import {
    appendAudiobookshelfAuthToken,
    buildRadioPlayback,
    buildSamoAudiobookFileQueue,
    buildSubsonicMusicPlayback,
    CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ,
    getSubsonicMusicQuality,
    isSubsonicSongHiRes,
    mimeFromAudiobookshelfExt,
    needsChromecastCompatibleStream,
    parseSamoAudiobookIdFromPlaybackId,
    pickSamoAudiobookFileIndexForBookTime,
    samoAudiobookFilePlaybacks,
} from './mobile-playback';
import { ServerType } from '../server/server-types';
import { type SamoAudiobook } from '../server/server-samo';

const authentication = testServerAuthentication();

describe('appendAudiobookshelfAuthToken', () => {
    it('appends token with ? when the URL has no query', () => {
        expect(appendAudiobookshelfAuthToken('https://abs.example.com/play', 'abc+def')).toBe(
            'https://abs.example.com/play?token=abc%2Bdef',
        );
    });

    it('appends token with & when the URL already has query params', () => {
        expect(appendAudiobookshelfAuthToken('https://abs.example.com/play?foo=1', 'token')).toBe(
            'https://abs.example.com/play?foo=1&token=token',
        );
    });
});

describe('mimeFromAudiobookshelfExt', () => {
    it('maps common extensions and strips a leading dot', () => {
        expect(mimeFromAudiobookshelfExt('.flac')).toBe('audio/flac');
        expect(mimeFromAudiobookshelfExt('m4b')).toBe('audio/mp4');
    });

    it('returns null for unknown extensions', () => {
        expect(mimeFromAudiobookshelfExt('weird')).toBeNull();
    });
});

describe('getSubsonicMusicQuality', () => {
    it('normalizes numeric strings and prefers samplingRate over sampleRate', () => {
        const quality = getSubsonicMusicQuality({
            bitDepth: '24',
            bitRate: '1411000',
            contentType: 'audio/flac',
            sampleRate: 44100,
            samplingRate: 96000,
            suffix: 'flac',
        });

        expect(quality).toMatchObject({
            bitDepth: 24,
            bitRate: 1411000,
            container: 'flac',
            deliveryKind: 'android-direct',
            losslessRequired: true,
            sampleRate: 96000,
        });
    });
});

describe('isSubsonicSongHiRes', () => {
    it('returns true for 24-bit / 96 kHz FLAC metadata', () => {
        expect(
            isSubsonicSongHiRes({
                bitDepth: 24,
                contentType: 'audio/flac',
                samplingRate: 96000,
                suffix: 'flac',
            }),
        ).toBe(true);
    });

    it('returns false for plain MP3 metadata', () => {
        expect(
            isSubsonicSongHiRes({
                bitDepth: 16,
                contentType: 'audio/mpeg',
                suffix: 'mp3',
            }),
        ).toBe(false);
    });
});

describe('buildSubsonicMusicPlayback', () => {
    it('builds a stream URL with format=raw and namespaces the playback id', () => {
        const playback = buildSubsonicMusicPlayback(
            authentication,
            {
                album: 'Album',
                artist: 'Artist',
                id: 'song-1',
                title: 'Track',
            },
            'https://music.example.com/art.jpg',
        );

        expect(playback).toMatchObject({
            artworkUrl: 'https://music.example.com/art.jpg',
            id: `${authentication.type}:${authentication.url}:music:song-1`,
            source: 'music',
            title: 'Track',
        });
        expect(playback?.url).toContain('/rest/stream.view?');
        expect(playback?.url).toContain('format=raw');
        expect(playback?.url).toContain('id=song-1');
    });

    it('routes hi-res lossless through a cast transcode URL', () => {
        const playback = buildSubsonicMusicPlayback(authentication, {
            bitDepth: 24,
            contentType: 'audio/flac',
            id: 'song-hires',
            samplingRate: 192_000,
            suffix: 'flac',
            title: 'Kind of Blue',
        });

        expect(playback?.castUrl).toContain('/rest/stream.view?');
        expect(playback?.castUrl).not.toContain('format=raw');
        expect(playback?.castUrl).toContain('format=mp3');
        expect(playback?.castMimeType).toBe('audio/mpeg');
        expect(playback?.url).toContain('format=raw');
    });

    it('returns null when required song fields are missing', () => {
        expect(buildSubsonicMusicPlayback(authentication, { id: 'song-1' })).toBeNull();
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

describe('buildRadioPlayback', () => {
    it('marks live radio streams and preserves the homepage URL', () => {
        const playback = buildRadioPlayback(authentication, {
            homepageUrl: 'https://station.example',
            id: 'station-1',
            name: 'Jazz FM',
            streamUrl: 'https://stream.example/live',
        });

        expect(playback).toMatchObject({
            homepageUrl: 'https://station.example',
            id: `${authentication.type}:${authentication.url}:radio:station-1`,
            isLive: true,
            source: 'radio',
            title: 'Jazz FM',
            url: 'https://stream.example/live',
        });
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

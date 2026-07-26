import { describe, expect, it } from 'vitest';

import { type SamoAudiobook } from '../server/server-samo';
import { ServerType } from '../server/server-types';
import { testServerAuthentication } from '../test-fixtures';
import {
    applySamoPodcastStreamResume,
    buildSamoAudiobookFileQueue,
    buildSamoPodcastEpisodePlayback,
    CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ,
    mimeFromAudioFileExt,
    needsChromecastCompatibleStream,
    parseSamoAudiobookIdFromPlaybackId,
    parseSamoAudiobookMediaFileIdFromPlaybackId,
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

    it('gives every file the WHOLE-BOOK timeline duration, not its own', () => {
        // The seek bar, the duration label and the tap->position mapping are all
        // book-global (as are progressOffsetSeconds and the chapter markers), so
        // reading the per-file durationSeconds there rendered the book as a bar
        // one file wide and sent every chapter tap into the first file.
        const queue = buildSamoAudiobookFileQueue(samoAuth(), threeFileBook(), {
            bookStartSeconds: 0,
        });
        expect(queue!.items.map((i) => i.timelineDurationSeconds)).toEqual([1620, 1620, 1620]);
        // ...while each item's own stream length stays per-file.
        expect(queue!.items.map((i) => i.durationSeconds)).toEqual([600, 540, 480]);
    });

    it('derives the timeline from the file manifest when the book duration is absent', () => {
        const { durationSeconds: _omitted, ...bookWithoutDuration } = threeFileBook();
        const queue = buildSamoAudiobookFileQueue(
            samoAuth(),
            bookWithoutDuration as SamoAudiobook,
            { bookStartSeconds: 0 },
        );
        // Last file ends at 1140 + 480.
        expect(queue!.items[0]!.timelineDurationSeconds).toBe(1620);
    });

    it('equals the file duration for a one-file book', () => {
        const queue = buildSamoAudiobookFileQueue(
            samoAuth(),
            {
                audioFiles: [{ durationMs: 3_600_000, id: 'only', startOffsetSeconds: 0 }],
                book: { title: 'One File' },
                durationSeconds: 3600,
                id: 'book-2',
            } as SamoAudiobook,
            { bookStartSeconds: 0 },
        );
        expect(queue!.items[0]!.timelineDurationSeconds).toBe(3600);
        expect(queue!.items[0]!.durationSeconds).toBe(3600);
    });
});

describe('parseSamoAudiobookMediaFileIdFromPlaybackId', () => {
    it('recovers the file id the queue item was built against', () => {
        const queue = buildSamoAudiobookFileQueue(samoAuth(), threeFileBook(), {
            bookStartSeconds: 0,
        });
        expect(
            queue!.items.map((item) => parseSamoAudiobookMediaFileIdFromPlaybackId(item.id)),
        ).toEqual(['file-1', 'file-2', 'file-3']);
    });

    it('returns undefined for the single-id form', () => {
        expect(
            parseSamoAudiobookMediaFileIdFromPlaybackId('samo:https://s:audiobook:book-1'),
        ).toBeUndefined();
    });
});

describe('buildSamoPodcastEpisodePlayback source routing', () => {
    const auth = testServerAuthentication({
        type: ServerType.SAMO,
        url: 'https://samo.example.com',
    });
    const baseEpisode = {
        durationSeconds: 1800,
        enclosureUrl: 'https://cdn.example.net/shows/ep-1.mp3?tk=abc',
        id: 'episode-1',
        podcastId: 'show-1',
        title: 'Episode One',
    };

    it('streams the enclosure directly with the proxy riding as fallback', () => {
        const playback = buildSamoPodcastEpisodePlayback(auth, baseEpisode, 'show-1');
        expect(playback?.url).toBe('https://cdn.example.net/shows/ep-1.mp3?tk=abc');
        expect(playback?.serverStreamUrl).toContain('/podcasts/episodes/episode-1/stream');
        expect(playback?.serverStreamUrl).toContain('https://samo.example.com');
    });

    it('prefers the server proxy when the server already holds the bytes', () => {
        for (const cache of [{ cached: true }, { local: true }]) {
            const playback = buildSamoPodcastEpisodePlayback(
                auth,
                { ...baseEpisode, cache },
                'show-1',
            );
            expect(playback?.url).toContain('/podcasts/episodes/episode-1/stream');
            expect(playback?.serverStreamUrl).toBeUndefined();
        }
    });

    it('falls back to the proxy when the enclosure is missing or not http(s)', () => {
        for (const enclosureUrl of [undefined, 'ftp://old.example.net/ep.mp3', 'not a url']) {
            const playback = buildSamoPodcastEpisodePlayback(
                auth,
                { ...baseEpisode, enclosureUrl },
                'show-1',
            );
            expect(playback?.url).toContain('/podcasts/episodes/episode-1/stream');
            expect(playback?.serverStreamUrl).toBeUndefined();
        }
    });

    it('keeps the direct URL across a resume refresh and re-tokens the fallback', () => {
        const playback = buildSamoPodcastEpisodePlayback(
            auth,
            { ...baseEpisode, progress: { progressSeconds: 90 } },
            'show-1',
            undefined,
            'tok-1',
        );
        expect(playback?.url).toBe(baseEpisode.enclosureUrl);
        expect(playback?.initialPositionSeconds).toBe(90);
        const refreshed = applySamoPodcastStreamResume(playback!, 120, auth, 'tok-2');
        expect(refreshed.url).toBe(baseEpisode.enclosureUrl);
        expect(refreshed.initialPositionSeconds).toBe(120);
        expect(refreshed.serverStreamUrl).toContain('stream_token=tok-2');
    });
});

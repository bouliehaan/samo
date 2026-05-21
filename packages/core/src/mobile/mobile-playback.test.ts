import { describe, expect, it } from 'vitest';

import { testServerAuthentication } from '../test-fixtures';
import {
    appendAudiobookshelfAuthToken,
    buildRadioPlayback,
    buildSubsonicMusicPlayback,
    getSubsonicMusicQuality,
    isSubsonicSongHiRes,
    mimeFromAudiobookshelfExt,
} from './mobile-playback';

const authentication = testServerAuthentication();

describe('appendAudiobookshelfAuthToken', () => {
    it('appends token with ? when the URL has no query', () => {
        expect(appendAudiobookshelfAuthToken('https://abs.example.com/play', 'abc+def')).toBe(
            'https://abs.example.com/play?token=abc%2Bdef',
        );
    });

    it('appends token with & when the URL already has query params', () => {
        expect(
            appendAudiobookshelfAuthToken('https://abs.example.com/play?foo=1', 'token'),
        ).toBe('https://abs.example.com/play?foo=1&token=token');
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

    it('returns null when required song fields are missing', () => {
        expect(buildSubsonicMusicPlayback(authentication, { id: 'song-1' })).toBeNull();
    });
});

describe('buildRadioPlayback', () => {
    it('marks live radio streams and preserves the homepage URL', () => {
        const playback = buildRadioPlayback(
            authentication,
            {
                homepageUrl: 'https://station.example',
                id: 'station-1',
                name: 'Jazz FM',
                streamUrl: 'https://stream.example/live',
            },
        );

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

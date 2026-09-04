import { describe, expect, it } from 'vitest';

import { testServerAuthentication } from '../test-fixtures';
import { buildSamoChannelPlaybackId, buildSamoInternetRadioPlayback } from './mobile-playback';
import {
    applyRadioNowPlayingToPlayback,
    formatRadioNowPlayingLine,
    formatRadioStreamFormat,
    formatRadioTagsLine,
    getRadioPlaybackMetadataLines,
    isRedundantRadioStationLabel,
    parseIcyStreamTitle,
    parseSamoChannelPlaybackId,
    parseSamoInternetRadioStationId,
    resolveSamoChannelPlaybackDisplay,
    resolveSamoInternetRadioPlaybackDisplay,
} from './mobile-radio-metadata';

const authentication = testServerAuthentication();

describe('formatRadioNowPlayingLine', () => {
    it('joins artist and title', () => {
        expect(formatRadioNowPlayingLine({ artist: 'Daft Punk', title: 'Around the World' })).toBe(
            'Daft Punk — Around the World',
        );
    });

    it('falls back to raw ICY text', () => {
        expect(formatRadioNowPlayingLine({ raw: 'Artist - Track Name' })).toBe(
            'Artist - Track Name',
        );
    });

    // Punctuation is not a song. `- - -` is the conventional "no metadata"
    // placeholder and reaches us already split into an artist and a title.
    it('says nothing when the station announced a placeholder', () => {
        expect(formatRadioNowPlayingLine({ artist: '-', title: '-' })).toBeUndefined();
        expect(formatRadioNowPlayingLine({ raw: '- - -' })).toBeUndefined();
        expect(formatRadioNowPlayingLine({ title: '...' })).toBeUndefined();
        // A title that is mostly punctuation is still a title.
        expect(formatRadioNowPlayingLine({ title: '---1---' })).toBe('---1---');
    });
});

describe('formatRadioStreamFormat', () => {
    it('combines bitrate and codec', () => {
        expect(formatRadioStreamFormat({ bitrate: 320, codec: 'mp3' })).toBe('320 kbps · MP3');
    });
});

describe('formatRadioTagsLine', () => {
    it('joins up to four tags', () => {
        expect(formatRadioTagsLine(['jazz', 'fm', 'nyc', 'live', 'extra'])).toBe(
            'jazz · fm · nyc · live',
        );
    });
});

describe('isRedundantRadioStationLabel', () => {
    it('treats station echo ICY titles as redundant', () => {
        expect(
            isRedundantRadioStationLabel(
                'BBC World Service',
                'BBC World Service - BBC World Service Online',
            ),
        ).toBe(true);
    });

    it('keeps real now playing', () => {
        expect(isRedundantRadioStationLabel('KEXP', 'Artist — Song Title')).toBe(false);
    });
});

describe('getRadioPlaybackMetadataLines', () => {
    it('omits redundant middle line for station-echo ICY metadata', () => {
        const lines = getRadioPlaybackMetadataLines({
            contentSourceId: 'test',
            id: 'radio:bbc',
            quality: {
                bitRate: 56,
                container: 'mp3',
                deliveryKind: 'android-direct',
                losslessRequired: false,
                serverTranscodeRequested: false,
            },
            radioStationName: 'BBC World Service',
            source: 'radio',
            subtitle: 'BBC World Service',
            title: 'BBC World Service - BBC World Service Online',
            url: 'https://example.com/stream',
        });

        expect(lines).toEqual(['BBC World Service', '56 kbps · MP3']);
    });
});

describe('resolveSamoInternetRadioPlaybackDisplay', () => {
    // The station record's `nowPlaying` is a probe samo-server ran up to ten
    // minutes ago, so it describes a song that has usually finished. A
    // listener holding the stream reads the real one out of the audio; seeding
    // from the snapshot only puts a wrong title up until that lands.
    it('starts on the station rather than on the server’s probe', () => {
        const display = resolveSamoInternetRadioPlaybackDisplay({
            id: 'station-1',
            name: 'KEXP',
            nowPlaying: { artist: 'Band', title: 'Song' },
            streamUrl: 'https://example.com/stream',
        });

        expect(display.playerTitle).toBe('KEXP');
        expect(display.playerSubtitle).toBe('Internet radio');
    });

    it('drops description that only repeats the station name', () => {
        const display = resolveSamoInternetRadioPlaybackDisplay({
            bitrate: 56,
            codec: 'mp3',
            description: 'BBC World Service - BBC World Service Online',
            id: 'station-1',
            name: 'BBC World Service',
            streamUrl: 'https://example.com/stream',
        });

        expect(display.playerTitle).toBe('BBC World Service');
        expect(display.playerSubtitle).toBe('56 kbps · MP3');
        expect(display.playerSubtitle).not.toContain('BBC World Service Online');
    });

    it('shows format and tags when idle', () => {
        const display = resolveSamoInternetRadioPlaybackDisplay({
            bitrate: 128,
            codec: 'aac',
            id: 'station-1',
            name: 'Jazz FM',
            streamUrl: 'https://example.com/stream',
            tags: ['jazz', 'smooth'],
        });

        expect(display.playerTitle).toBe('Jazz FM');
        expect(display.playerSubtitle).toContain('128 kbps');
        expect(display.playerSubtitle).toContain('jazz');
    });
});

describe('parseSamoInternetRadioStationId', () => {
    it('extracts station id from playback id', () => {
        expect(parseSamoInternetRadioStationId('samo:https://x:internet-radio:abc-123')).toBe(
            'abc-123',
        );
    });
});

describe('resolveSamoChannelPlaybackDisplay', () => {
    const jake = { description: "Jake's own station", name: 'Jake' };

    it('shows what is airing, from the list payload or a fresh poll', () => {
        expect(
            resolveSamoChannelPlaybackDisplay({
                ...jake,
                nowPlaying: { artist: 'Miles Davis', title: 'So What' },
            }).playerTitle,
        ).toBe('So What');

        // A live poll overrides whatever the list happened to carry — the list
        // may be minutes old by the time somebody tunes in.
        expect(
            resolveSamoChannelPlaybackDisplay(
                { ...jake, nowPlaying: { title: 'So What' } },
                { title: 'Blue in Green' },
            ).playerTitle,
        ).toBe('Blue in Green');
    });

    it('names itself a channel when it is not announcing anything', () => {
        // Never "Internet radio": a station nobody can find anywhere else must
        // not be labelled as somebody's stream off the web.
        expect(resolveSamoChannelPlaybackDisplay({ name: 'Jake' }).playerSubtitle).toBe(
            'samo channel',
        );
        expect(resolveSamoChannelPlaybackDisplay(jake).playerSubtitle).toBe("Jake's own station");
    });
});

describe('parseSamoChannelPlaybackId', () => {
    it('reads the channel id back out of a playback id', () => {
        expect(parseSamoChannelPlaybackId(buildSamoChannelPlaybackId(authentication, 'jake'))).toBe(
            'jake',
        );
    });

    it('does not mistake an internet station for a channel', () => {
        // The two catalogs have freely colliding ids, so a false positive here
        // tunes the stereo to a different station.
        expect(parseSamoChannelPlaybackId('samo:https://x:internet-radio:jake')).toBeUndefined();
    });
});

describe('parseIcyStreamTitle', () => {
    it('splits the artist off the song', () => {
        expect(parseIcyStreamTitle("StreamTitle='Elvis Presley - Kentucky Rain';")).toEqual({
            artist: 'Elvis Presley',
            raw: 'Elvis Presley - Kentucky Rain',
            title: 'Kentucky Rain',
        });
    });

    // ExoPlayer unwraps the frame for us and hands over the title alone, while
    // a socket reader sees the whole blob. Same announcement either way.
    it('takes the bare title a player already unwrapped', () => {
        expect(parseIcyStreamTitle('Elvis Presley - Kentucky Rain')?.title).toBe('Kentucky Rain');
        expect(parseIcyStreamTitle('StreamTitle="Miles Davis — So What";')?.artist).toBe(
            'Miles Davis',
        );
    });

    it('keeps a title that came without an artist', () => {
        expect(parseIcyStreamTitle('The Breakfast Show')).toEqual({
            raw: 'The Breakfast Show',
            title: 'The Breakfast Show',
        });
        expect(parseIcyStreamTitle('- Kentucky Rain')).toEqual({
            artist: undefined,
            raw: '- Kentucky Rain',
            title: 'Kentucky Rain',
        });
    });

    // The SiriusXM relay announces this while it waits for the channel it has
    // just tuned. It is the placeholder, not a song by an artist called `-`.
    it('says nothing for a placeholder announcement', () => {
        expect(parseIcyStreamTitle("StreamTitle='- - -';")).toBeUndefined();
        expect(parseIcyStreamTitle("StreamTitle='';")).toBeUndefined();
        expect(parseIcyStreamTitle('')).toBeUndefined();
        expect(parseIcyStreamTitle(undefined)).toBeUndefined();
    });
});

describe('applyRadioNowPlayingToPlayback', () => {
    const station =
        buildSamoInternetRadioPlayback(
            authentication,
            {
                codec: 'aac',
                id: 'station-1',
                name: 'Elvis Radio',
                // The probe's placeholder, exactly as the server stores it —
                // and never a seed for what the player shows.
                nowPlaying: { artist: '-', raw: '- - -', title: '-' },
                streamUrl: 'https://example.com/stream',
            },
            undefined,
        ) ??
        (() => {
            throw new Error('expected playback');
        })();

    it('starts on the station, not on the server’s probe', () => {
        expect(station.title).toBe('Elvis Radio');
        expect(station.subtitle).toBe('AAC');
    });

    it('states what the stream announced', () => {
        const playing = applyRadioNowPlayingToPlayback(
            station,
            parseIcyStreamTitle('Elvis Presley - Kentucky Rain'),
        );

        expect(playing.title).toBe('Kentucky Rain');
        expect(playing.artist).toBe('Elvis Presley');
        expect(playing.subtitle).toBe('Elvis Presley · Elvis Radio');
        expect(getRadioPlaybackMetadataLines(playing)).toEqual([
            'Elvis Radio',
            'Elvis Presley — Kentucky Rain',
            'AAC',
        ]);
    });

    it('keeps a title that arrived without an artist', () => {
        // Regression: an ABSENT artist used to disqualify the whole track, so a
        // station announcing a title alone — plain ICY, or anything spoken-word,
        // which has no artist to report — showed its own name forever.
        const playing = applyRadioNowPlayingToPlayback(
            station,
            parseIcyStreamTitle('The Breakfast Show'),
        );

        expect(playing.title).toBe('The Breakfast Show');
        expect(playing.subtitle).toBe('Elvis Radio');
    });

    it('lets the station name itself again when it goes quiet', () => {
        const playing = applyRadioNowPlayingToPlayback(
            station,
            parseIcyStreamTitle('Elvis Presley - Kentucky Rain'),
        );

        expect(applyRadioNowPlayingToPlayback(playing, undefined).title).toBe('Elvis Radio');
    });

    it('returns the same item when nothing moved', () => {
        // The playback store writes on identity, so an unchanged line must not
        // become a state update (and a re-render) every announcement.
        const playing = applyRadioNowPlayingToPlayback(station, { title: 'Kentucky Rain' });

        expect(applyRadioNowPlayingToPlayback(playing, { title: 'Kentucky Rain' })).toBe(playing);
    });
});

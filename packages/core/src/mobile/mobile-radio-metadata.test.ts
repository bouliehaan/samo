import { describe, expect, it } from 'vitest';

import { testServerAuthentication } from '../test-fixtures';
import { buildSamoInternetRadioPlayback } from './mobile-playback';
import {
    enrichSamoRadioPlaybackItem,
    formatRadioNowPlayingLine,
    formatRadioStreamFormat,
    formatRadioTagsLine,
    getRadioPlaybackMetadataLines,
    isRedundantRadioStationLabel,
    parseSamoInternetRadioStationId,
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
    it('uses track title when now playing is present', () => {
        const display = resolveSamoInternetRadioPlaybackDisplay({
            id: 'station-1',
            name: 'KEXP',
            nowPlaying: { artist: 'Band', title: 'Song' },
            streamUrl: 'https://example.com/stream',
        });

        expect(display.playerTitle).toBe('Song');
        expect(display.playerSubtitle).toBe('Band · KEXP');
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

describe('enrichSamoRadioPlaybackItem', () => {
    it('updates playable title and subtitle from station snapshot', () => {
        const base =
            buildSamoInternetRadioPlayback(
                authentication,
                {
                    id: 'station-1',
                    name: 'KEXP',
                    nowPlaying: { title: 'Live Set' },
                    streamUrl: 'https://example.com/stream',
                },
                undefined,
            ) ??
            (() => {
                throw new Error('expected playback');
            })();

        const enriched = enrichSamoRadioPlaybackItem(base, {
            id: 'station-1',
            name: 'KEXP',
            nowPlaying: { artist: 'Guest', title: 'Live Set' },
            streamUrl: 'https://example.com/stream',
        });

        expect(enriched.title).toBe('Live Set');
        expect(enriched.subtitle).toBe('Guest · KEXP');
    });
});

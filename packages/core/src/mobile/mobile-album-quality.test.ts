import { describe, expect, it } from 'vitest';

import { samoAlbumQualityProfile } from './mobile-home';
import {
    getItemQualityProfile,
    propagateSearchAlbumQualityFromSongs,
} from './mobile-quality-profile';

describe('samoAlbumQualityProfile', () => {
    it('uses server-aggregated maxBitDepth and maxSampleRate on list/search albums', () => {
        expect(
            samoAlbumQualityProfile({
                maxBitDepth: 24,
                maxSampleRate: 96_000,
            }),
        ).toEqual({ bitDepth: 24, sampleRate: 96_000 });
    });

    it('falls back to track audio files on detail payloads', () => {
        expect(
            samoAlbumQualityProfile({
                tracks: [
                    {
                        audioFiles: [{ bitDepth: 16, sampleRate: 44_100 }],
                        id: 't1',
                        title: 'One',
                    },
                    {
                        audioFiles: [{ bitDepth: 24, sampleRate: 192_000 }],
                        id: 't2',
                        title: 'Two',
                    },
                ],
            }),
        ).toEqual({ bitDepth: 24, sampleRate: 192_000 });
    });
});

describe('propagateSearchAlbumQualityFromSongs', () => {
    it('stamps album rows from matching song playback when the album scan missed', () => {
        const albums = [{ id: 'album-1', title: 'Hi-Fi Album' }];
        const songs = [
            {
                albumId: 'album-1',
                id: 'song-1',
                playback: {
                    quality: {
                        bitDepth: 24,
                        bitRate: null,
                        channelCount: 2,
                        container: 'flac',
                        deliveryKind: 'android-direct' as const,
                        losslessRequired: true,
                        sampleRate: 96_000,
                        serverTranscodeRequested: false,
                    },
                },
            },
        ];

        const [album] = propagateSearchAlbumQualityFromSongs(albums, songs);
        expect(album.qualityProfile).toEqual({ bitDepth: 24, sampleRate: 96_000 });
        expect(getItemQualityProfile(album)).toEqual({ bitDepth: 24, sampleRate: 96_000 });
    });
});

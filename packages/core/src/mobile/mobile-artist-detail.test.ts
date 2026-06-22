import { describe, expect, it } from 'vitest';

import { ServerType } from '../server/server-types';
import {
    type SamoMusicAlbum,
    type SamoMusicArtist,
    type SamoMusicTrack,
} from '../server/server-samo';
import { testServerAuthentication } from '../test-fixtures';
import { mapSamoArtistDetail, MobileMediaDetailType } from './mobile-media-detail';
import { MobileHomeItemType } from './mobile-home';

const samoAuth = () =>
    testServerAuthentication({ type: ServerType.SAMO, url: 'https://samo.example.com' });

const album = (id: string, title: string, year: number): SamoMusicAlbum => ({
    id,
    releaseYear: year,
    title,
});

const track = (id: string, title: string): SamoMusicTrack => ({
    id,
    title,
});

describe('mapSamoArtistDetail enrichment sections', () => {
    it('maps albums, top tracks, appears-on, related artists, and bio', () => {
        const artist: SamoMusicArtist = {
            biography: 'A short biography.',
            id: 'artist-1',
            name: 'The Artist',
            similarArtists: [
                { id: 'artist-2', name: 'Neighbour One' },
                { id: 'artist-3', name: 'Neighbour Two' },
            ],
        };

        const detail = mapSamoArtistDetail(
            samoAuth(),
            undefined,
            artist,
            [album('own-1', 'Own Album', 2019)],
            [track('t-1', 'Hit Song')],
            [album('comp-1', 'Various Comp', 2022)],
        );

        expect(detail.type).toBe(MobileMediaDetailType.ARTIST);
        expect(detail.biography).toBe('A short biography.');
        expect(detail.items?.map((i) => i.id)).toEqual(['own-1']);
        expect(detail.appearsOnItems?.map((i) => i.id)).toEqual(['comp-1']);
        expect(detail.topTracks?.map((t) => t.id)).toEqual(['t-1']);
        expect(detail.relatedArtists?.map((a) => a.id)).toEqual(['artist-2', 'artist-3']);
        expect(detail.relatedArtists?.[0]?.type).toBe(MobileHomeItemType.ARTIST);
    });

    it('keeps external similar artists with a provider image + search-routing flag', () => {
        const artist: SamoMusicArtist = {
            id: 'artist-1',
            name: 'The Artist',
            similarArtists: [
                { id: 'artist-2', name: 'In Library' },
                {
                    external: true,
                    id: '',
                    imageUrl: 'https://img.example/external.jpg',
                    name: 'Not In Library',
                },
            ],
        };

        const detail = mapSamoArtistDetail(samoAuth(), undefined, artist, []);

        const related = detail.relatedArtists ?? [];
        expect(related).toHaveLength(2);

        const local = related.find((a) => a.id === 'artist-2');
        expect(local?.external).toBeFalsy();

        const external = related.find((a) => a.external);
        expect(external?.title).toBe('Not In Library');
        expect(external?.artworkUrl).toBe('https://img.example/external.jpg');
        // Synthetic id so it never drives a detail fetch.
        expect(external?.id).toBe('ext:Not In Library');
        expect(external?.type).toBe(MobileHomeItemType.ARTIST);
    });

    it('omits enrichment sections when the server provides none (back-compat)', () => {
        const detail = mapSamoArtistDetail(
            samoAuth(),
            undefined,
            { id: 'artist-1', name: 'The Artist' },
            [album('own-1', 'Own Album', 2019)],
        );

        expect(detail.items).toHaveLength(1);
        expect(detail.appearsOnItems).toBeUndefined();
        expect(detail.topTracks).toBeUndefined();
        expect(detail.relatedArtists).toBeUndefined();
        expect(detail.biography).toBeUndefined();
    });
});

import { describe, expect, it } from 'vitest';

import { type SamoFetch } from './server-http';
import {
    findSamoExploPlaylist,
    resolveSamoPlaylistArtworkUrl,
    samoPlaylistHasCoverGrid,
} from './server-samo';
import { buildSamoAuthenticatedImageRequest } from './server-samo-stream-token';
import { ServerType } from './server-types';

const auth = {
    credential: 'bearer-token',
    type: ServerType.SAMO,
    url: 'https://music.example',
};

describe('Samo artwork URLs', () => {
    it('uses the playlist cover endpoint for multi-image playlist art', () => {
        const url = resolveSamoPlaylistArtworkUrl(auth, {
            id: 'playlist 1',
            images: [{ id: 'cover_a' }, { id: 'cover_b' }],
        });

        expect(url).toBe('https://music.example/api/v1/music/playlists/playlist%201/cover');
    });

    it('flags a multi-cover playlist as a grid and a 0/1-cover one as not', () => {
        expect(samoPlaylistHasCoverGrid({ images: [{ id: 'cover_a' }, { id: 'cover_b' }] })).toBe(
            true,
        );
        expect(samoPlaylistHasCoverGrid({ images: [{ id: 'cover_a' }] })).toBe(false);
        expect(samoPlaylistHasCoverGrid({ images: [] })).toBe(false);
        expect(samoPlaylistHasCoverGrid({ images: undefined })).toBe(false);
    });

    it('keeps bearer auth on image requests even when a stream token is in the URL', () => {
        const request = buildSamoAuthenticatedImageRequest(
            auth,
            'https://music.example/api/v1/media/images/cover_a/image?stream_token=old',
            'cache-key',
        );

        expect(request.headers).toEqual({ Authorization: 'Bearer bearer-token' });
    });
});

const jsonFetch = (data: unknown, capture?: (url: string) => void): SamoFetch => {
    return async (url) => {
        capture?.(url);
        const body = JSON.stringify(data);
        return {
            json: async () => JSON.parse(body) as unknown,
            ok: true,
            status: 200,
            text: async () => body,
        };
    };
};

describe('findSamoExploPlaylist', () => {
    it('returns the system-managed playlist and queries the playlists endpoint', async () => {
        let requested = '';
        const fetcher = jsonFetch(
            {
                items: [
                    { id: 'p1', name: 'Liked Songs' },
                    { id: 'p2', name: 'Explo', system: true },
                ],
                limit: 100,
                offset: 0,
                total: 2,
            },
            (url) => {
                requested = url;
            },
        );

        const explo = await findSamoExploPlaylist(fetcher, auth);

        expect(explo?.id).toBe('p2');
        expect(requested).toContain('/music/playlists');
    });

    it('returns undefined when nothing is system-managed (feature off / no drops yet)', async () => {
        const fetcher = jsonFetch({
            items: [
                { id: 'p1', name: 'Liked Songs' },
                { id: 'p2', name: 'Roadtrip' },
            ],
            limit: 100,
            offset: 0,
            total: 2,
        });

        expect(await findSamoExploPlaylist(fetcher, auth)).toBeUndefined();
    });

    it('recognizes the playlist by the system flag, not its name', async () => {
        // A user's own playlist literally named "Explo" must NOT be treated as
        // the server-managed one - otherwise a home card would open the wrong
        // playlist and Recently Added filtering would key off the wrong thing.
        const fetcher = jsonFetch({
            items: [{ id: 'p1', name: 'Explo' }],
            limit: 100,
            offset: 0,
            total: 1,
        });

        expect(await findSamoExploPlaylist(fetcher, auth)).toBeUndefined();
    });
});

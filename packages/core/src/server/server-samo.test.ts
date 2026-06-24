import { describe, expect, it } from 'vitest';

import { resolveSamoPlaylistArtworkUrl } from './server-samo';
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

    it('keeps bearer auth on image requests even when a stream token is in the URL', () => {
        const request = buildSamoAuthenticatedImageRequest(
            auth,
            'https://music.example/api/v1/media/images/cover_a/image?stream_token=old',
            'cache-key',
        );

        expect(request.headers).toEqual({ Authorization: 'Bearer bearer-token' });
    });
});

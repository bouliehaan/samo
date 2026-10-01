import { ServerType } from '@samo/core/server';
import { describe, expect, it } from 'vitest';

import { normalizeSamoMusicPlaylist } from './samo-normalize';

const server = {
    credential: 'token',
    id: 'server',
    name: 'Samo',
    type: ServerType.SAMO,
    url: 'https://music.example',
    userId: null,
    username: 'tester',
};

describe('desktop playlist artwork', () => {
    it.each([undefined, [], [{ id: 'cover_a' }], [{ id: 'cover_a' }, { id: 'cover_b' }]])(
        'keeps the playlist identity for both URL and ID consumers (%j)',
        (images) => {
            const item = normalizeSamoMusicPlaylist({ id: 'pl1', images, name: 'Mix' }, server);
            expect(item.imageId).toBe('pl1');
            expect(item.imageUrl).toBe(
                'https://music.example/api/v1/music/playlists/pl1/cover?artwork=2',
            );
        },
    );
});

import { describe, expect, it } from 'vitest';

import { type SamoFetch } from '../server/server-http';
import { type SamoMusicPlaylist, type SamoMusicTrack } from '../server/server-samo';
import { testServerAuthentication } from '../test-fixtures';
import {
    loadMobileMediaDetail,
    mapSamoPlaylistDetail,
    MobileMediaDetailType,
} from './mobile-media-detail';

const auth = testServerAuthentication({ url: 'https://music.example' });

const playlist = (images: SamoMusicPlaylist['images']): SamoMusicPlaylist => ({
    id: 'pl1',
    images,
    name: 'Road Trip',
});

describe('mapSamoPlaylistDetail artwork', () => {
    it('renders the 2x2 grid for a multi-cover playlist and drops the single image id', () => {
        const detail = mapSamoPlaylistDetail(
            auth,
            undefined,
            playlist([{ id: 'cover_a' }, { id: 'cover_b' }, { id: 'cover_c' }]),
            [],
        );

        expect(detail.type).toBe(MobileMediaDetailType.PLAYLIST);
        // The grid cover endpoint — NOT /media/images/<first>/image — must win,
        // so the display resolver can't prefer a single cover over the grid.
        expect(detail.artworkUrl).toBe('https://music.example/api/v1/music/playlists/pl1/cover');
        expect(detail.artworkImageId).toBeUndefined();
    });

    it('keeps the single image id when the playlist has only one cover', () => {
        const detail = mapSamoPlaylistDetail(auth, undefined, playlist([{ id: 'cover_a' }]), []);

        expect(detail.artworkImageId).toBe('cover_a');
    });

    it('falls a playlist track with no embedded art back to its own album cover', () => {
        // Explo drops apply their fetched art to the ALBUM, not the file, so the
        // track ships with an empty images[] but a real albumId. In a playlist
        // (built with no album fallback) the track must resolve to its own
        // /albums/{albumId}/cover — not undefined (blank player) and not the
        // playlist's art (which made every explo row show the same image).
        const detail = mapSamoPlaylistDetail(auth, undefined, playlist([{ id: 'cover_a' }]), [
            { albumId: 'alb1', id: 't1', title: 'Espresso' } as SamoMusicTrack,
            { albumId: 'alb2', id: 't2', title: 'Birds of a Feather' } as SamoMusicTrack,
        ]);

        expect(detail.tracks[0]?.artworkUrl).toBe(
            'https://music.example/api/v1/music/albums/alb1/cover',
        );
        expect(detail.tracks[0]?.artworkImageId).toBeUndefined();
        // Distinct albums resolve to distinct covers — the rows are no longer
        // identical.
        expect(detail.tracks[1]?.artworkUrl).toBe(
            'https://music.example/api/v1/music/albums/alb2/cover',
        );
    });
});

describe('large playlist / podcast pagination', () => {
    // Regression: the loaders used a single limit=500 request, so any playlist
    // (or show) past 500 entries was silently TRUNCATED — the UI presented 500
    // tracks as if that were the whole list. The loaders must paginate to
    // exhaustion, stopping on the first short page.
    const jsonResponse = (payload: unknown) => ({
        json: () => Promise.resolve(payload),
        ok: true,
        status: 200,
    });

    const buildFetch = (
        listPath: string,
        entityPayload: unknown,
        totalCount: number,
        requestedOffsets: number[],
    ): SamoFetch => {
        return (url) => {
            const parsed = new URL(url);
            if (parsed.pathname.endsWith(listPath)) {
                const offset = Number(parsed.searchParams.get('offset') ?? '0');
                const limit = Number(parsed.searchParams.get('limit') ?? '500');
                requestedOffsets.push(offset);
                const items = Array.from(
                    { length: Math.max(0, Math.min(limit, totalCount - offset)) },
                    (_, index) => ({
                        id: `entry_${offset + index}`,
                        title: `Entry ${offset + index}`,
                    }),
                );
                return Promise.resolve(jsonResponse({ items, total: totalCount }));
            }
            if (parsed.pathname.includes('/stream-token')) {
                // Token mint is best-effort in the loaders (.catch → undefined).
                return Promise.resolve({
                    json: () => Promise.resolve({}),
                    ok: false,
                    status: 500,
                });
            }
            return Promise.resolve(jsonResponse(entityPayload));
        };
    };

    it('loads every track of a >500-track playlist', async () => {
        const offsets: number[] = [];
        const detail = await loadMobileMediaDetail({
            authentication: auth,
            fetch: buildFetch('/tracks', { id: 'pl1', name: 'Mega Mix' }, 1234, offsets),
            id: 'pl1',
            type: MobileMediaDetailType.PLAYLIST,
        });

        expect(detail.tracks).toHaveLength(1234);
        expect(offsets).toEqual([0, 500, 1000]);
        expect(detail.tracks[1233]?.id).toBe('entry_1233');
    });

    it('loads every episode of a >500-episode podcast', async () => {
        const offsets: number[] = [];
        const detail = await loadMobileMediaDetail({
            authentication: auth,
            fetch: buildFetch(
                '/episodes',
                { id: 'show1', podcast: { title: 'Daily Show' } },
                750,
                offsets,
            ),
            id: 'show1',
            type: MobileMediaDetailType.PODCAST,
        });

        expect(detail.tracks).toHaveLength(750);
        expect(offsets).toEqual([0, 500]);
    });

    it('stops after one page when the list fits', async () => {
        const offsets: number[] = [];
        const detail = await loadMobileMediaDetail({
            authentication: auth,
            fetch: buildFetch('/tracks', { id: 'pl2', name: 'Short' }, 40, offsets),
            id: 'pl2',
            type: MobileMediaDetailType.PLAYLIST,
        });

        expect(detail.tracks).toHaveLength(40);
        expect(offsets).toEqual([0]);
    });
});

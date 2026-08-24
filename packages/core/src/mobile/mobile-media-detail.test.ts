import { describe, expect, it } from 'vitest';

import { type SamoFetch } from '../server/server-http';
import {
    type SamoMusicPlaylist,
    type SamoMusicTrack,
    type SamoPodcastEpisode,
} from '../server/server-samo';
import { testServerAuthentication } from '../test-fixtures';
import {
    buildAlbumMetadataLines,
    loadMobileMediaDetail,
    mapSamoArtistDetail,
    mapSamoMediaDetailFromRawBundle,
    mapSamoMediaTrackFromRaw,
    mapSamoPlaylistDetail,
    mapSamoPodcastEpisodeTrackFromRaw,
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

describe('album items carry the release year', () => {
    // Regression: the year lived only on the album DETAIL view model, but the
    // Android mirror stores no album detail row — it rebuilds an album's page
    // from the item payload plus the stored track rows. So every mirrored album
    // opened with no year at all, which is most of them. The year belongs on
    // the ITEM, and the artist page's album tiles are one of the taps that
    // carries it into the detail page.
    it('puts the year on the artist page album tiles as a field, not only as display text', () => {
        const detail = mapSamoArtistDetail(auth, undefined, { id: 'art1', name: 'Talk Talk' }, [
            {
                albumArtistNames: ['Talk Talk'],
                id: 'alb1',
                releaseYear: 1988,
                title: 'Spirit of Eden',
            },
            { id: 'alb2', title: 'Undated' },
        ]);

        expect(detail.items?.[0]?.year).toBe(1988);
        // The tile subtitle renders the year because an artist page needn't
        // repeat its own artist — but a formatted string is display text, not
        // data. The tap that opens the album detail needs the number.
        expect(detail.items?.[0]?.subtitle).toBe('1988');
        expect(detail.items?.[1]?.year).toBeUndefined();
    });
});

describe('buildAlbumMetadataLines', () => {
    // The hero stacks metadataLines as centered rows under the cover, on top of
    // the eyebrow, title, year, artist and format badge it already draws. Genre
    // and label therefore have to share ONE row, or an album header becomes a
    // column of text.
    it('joins genres and label into a single credits line', () => {
        expect(buildAlbumMetadataLines(['Art Rock'], 'Parlophone')).toEqual([
            'Art Rock · Parlophone',
        ]);
    });

    it('keeps the label visible when the server reports a pile of genres', () => {
        // The row truncates at one line, so an uncapped genre list would push
        // the label off the end — losing the very field this line exists for.
        expect(
            buildAlbumMetadataLines(
                ['Alternative Rock', 'Post-Punk', 'New Wave', 'Art Rock'],
                'Parlophone',
            ),
        ).toEqual(['Alternative Rock, Post-Punk · Parlophone']);
    });

    it('renders whichever half is present on its own', () => {
        expect(buildAlbumMetadataLines(['Jazz'], undefined)).toEqual(['Jazz']);
        expect(buildAlbumMetadataLines(undefined, 'Blue Note')).toEqual(['Blue Note']);
    });

    it('stays undefined when the album has neither, so the hero draws no empty row', () => {
        expect(buildAlbumMetadataLines(undefined, undefined)).toBeUndefined();
        expect(buildAlbumMetadataLines([], '   ')).toBeUndefined();
    });
});

describe('large playlist / podcast pagination', () => {
    // Regression: the loaders used a single limit=500 request, so any playlist
    // (or show) past 500 entries was silently TRUNCATED — the UI presented 500
    // tracks as if that were the whole list.
    //
    // The fix must paginate to exhaustion WITHOUT over-fetching. An earlier
    // attempt fired a fixed window of four concurrent pages, which cost a
    // 40-track playlist four requests where it needed one. The offsets asserted
    // below are the real contract: exactly the pages the list requires.
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
        // Servers that answer without a `total` must still be paginated
        // correctly — the loader falls back to fetching until a short page.
        omitTotal = false,
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
                return Promise.resolve(
                    jsonResponse(omitTotal ? { items } : { items, total: totalCount }),
                );
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

    it('requests not one page more than the reported total needs', async () => {
        // The guarantee that matters on mobile: no speculative page ever goes
        // out. An exactly-full first page must NOT trigger a second request
        // when `total` says 500 is all there is.
        const offsets: number[] = [];
        const detail = await loadMobileMediaDetail({
            authentication: auth,
            fetch: buildFetch('/tracks', { id: 'pl3', name: 'Exactly Full' }, 500, offsets),
            id: 'pl3',
            type: MobileMediaDetailType.PLAYLIST,
        });

        expect(detail.tracks).toHaveLength(500);
        expect(offsets).toEqual([0]);
    });

    it('paginates sequentially when the server sends no total', async () => {
        const offsets: number[] = [];
        const detail = await loadMobileMediaDetail({
            authentication: auth,
            fetch: buildFetch('/tracks', { id: 'pl4', name: 'No Total' }, 1234, offsets, true),
            id: 'pl4',
            type: MobileMediaDetailType.PLAYLIST,
        });

        expect(detail.tracks).toHaveLength(1234);
        expect(offsets).toEqual([0, 500, 1000]);
    });
});

describe('podcast episodes stored in the catalog mirror', () => {
    // Regression: the Android sync stores playlist tracks AND podcast episodes
    // in the same `$samoRawTrack` envelope — only the row's container_type
    // separates them — and the read path hydrated every row through the MUSIC
    // mapper. An episode came out as `source: 'music'` with no artwork and a
    // `/music/tracks/<episodeId>/stream` URL that can never serve it, so every
    // show the sync had crawled played nothing and showed no cover.
    const episode: SamoPodcastEpisode = {
        durationSeconds: 3120,
        enclosureUrl: 'https://cdn.example/ep7.mp3',
        id: 'ep7',
        title: 'The One About Bees',
    };
    const envelope = { $samoRawTrack: 1 as const, track: episode };

    it('maps an episode row to a podcast playable on the episode stream route', () => {
        const track = mapSamoPodcastEpisodeTrackFromRaw(
            auth,
            undefined,
            envelope,
            'show1',
            'https://music.example/api/v1/podcasts/shows/show1/cover',
        );

        expect(track?.playback?.source).toBe('podcast');
        expect(track?.playback?.id).toBe('samo:https://music.example:podcast:show1:ep7');
        // The show/episode ids the progress sync keys on.
        expect(track?.episodeId).toBe('ep7');
        expect(track?.itemId).toBe('show1');
    });

    it("falls an episode with no art of its own back to the show's cover", () => {
        const track = mapSamoPodcastEpisodeTrackFromRaw(
            auth,
            undefined,
            envelope,
            'show1',
            'https://music.example/api/v1/podcasts/shows/show1/cover',
        );

        expect(track?.artworkUrl).toBe('https://music.example/api/v1/podcasts/shows/show1/cover');
        expect(track?.playback?.artworkUrl).toBe(
            'https://music.example/api/v1/podcasts/shows/show1/cover',
        );
    });

    it('is exactly what the music mapper gets wrong on the same row', () => {
        // Pins the failure mode itself: reading the SAME envelope as music is
        // silent — a plausible-looking track with a URL that cannot work.
        const asMusic = mapSamoMediaTrackFromRaw(auth, undefined, envelope);

        expect(asMusic?.playback?.source).toBe('music');
        expect(asMusic?.playback?.url).toBe('https://music.example/api/v1/music/tracks/ep7/stream');
        expect(asMusic?.artworkUrl).toBeUndefined();
    });
});

describe('mapSamoPlaylistDetail editability', () => {
    const owned = (
        overrides: Partial<Parameters<typeof testServerAuthentication>[0]>,
        ownerId?: string,
        system?: boolean,
    ) =>
        mapSamoPlaylistDetail(
            testServerAuthentication({ url: 'https://music.example', ...overrides }),
            undefined,
            { id: 'pl1', name: 'Cool Christmas', ownerId, system },
            [],
        ).playlistMeta?.editable;

    it('lets the owner edit their own playlist', () => {
        expect(owned({ userId: 'user-1' }, 'user-1')).toBe(true);
    });

    it('keeps a non-admin out of somebody else’s playlist', () => {
        expect(owned({ userId: 'user-1' }, 'user-2')).toBe(false);
    });

    // Server-managed rows (.m3u imports, migrations) are owned by the internal
    // bootstrap account no human authenticates as. The server lets an admin
    // write them; before this the app hid every edit affordance and the add-to-
    // playlist call came back 403 "playlist owner required".
    it('lets an admin edit a server-owned playlist', () => {
        expect(owned({ isAdmin: true, userId: 'user-1' }, 'user-server')).toBe(true);
    });

    it('still refuses a system playlist, admin or not', () => {
        expect(owned({ isAdmin: true, userId: 'user-1' }, 'user-server', true)).toBe(false);
    });
});

describe('stored playlist bundles keep their editability', () => {
    // The Android mirror does not store a playlist detail the way it fetched
    // it: SamoCatalogSync.slimDetailBundle strips `children.tracks` before the
    // row is written, because the tracks are fanned out into `catalog_track`
    // and storing them twice was 44MB of duplicate JSON.
    //
    // What survives that strip is what decides whether the playlist page offers
    // any editing at all. Ownership lives on the ENTITY, not the tracks, so a
    // stripped bundle must still map to a real `playlistMeta` — the read path
    // reads this row for no other reason.
    const storedBundle = (ownerId: string, system?: boolean) =>
        ({
            $samoRawDetail: 1,
            children: {},
            entity: { id: 'pl1', name: 'Road Trip', ownerId, system },
            kind: 'playlist',
        }) as const;

    it('still reports the owner as able to edit after the tracks are stripped', () => {
        const detail = mapSamoMediaDetailFromRawBundle(
            testServerAuthentication({ url: 'https://music.example', userId: 'user-1' }),
            undefined,
            storedBundle('user-1'),
        );

        expect(detail?.tracks).toEqual([]);
        expect(detail?.playlistMeta?.editable).toBe(true);
    });

    it('still refuses a server-managed playlist after the tracks are stripped', () => {
        const detail = mapSamoMediaDetailFromRawBundle(
            testServerAuthentication({ url: 'https://music.example', userId: 'user-1' }),
            undefined,
            storedBundle('user-1', true),
        );

        expect(detail?.playlistMeta?.editable).toBe(false);
    });
});

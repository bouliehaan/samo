import { describe, expect, it } from 'vitest';

import { type SamoFetch } from './server-http';
import {
    finalizeSamoMediaUrl,
    findSamoExploPlaylist,
    getSamoApiUrl,
    getSamoAudiobookStreamUrl,
    getSamoMetadataImageUrl,
    getSamoMusicTrackStreamUrl,
    resolveSamoPlaylistArtworkUrl,
    samoPlaylistCoverVersion,
    samoPlaylistHasCoverGrid,
} from './server-samo';
import { buildSamoAuthenticatedImageRequest, withSamoImageWidth } from './server-samo-stream-token';
import { ServerType } from './server-types';

const auth = {
    credential: 'bearer-token',
    type: ServerType.SAMO,
    url: 'https://music.example',
};

describe('samo artwork URLs', () => {
    it('uses the playlist cover endpoint for multi-image playlist art', () => {
        const url = resolveSamoPlaylistArtworkUrl(auth, {
            id: 'playlist 1',
            images: [{ id: 'cover_a' }, { id: 'cover_b' }],
        });

        expect(url).toBe('https://music.example/api/v1/music/playlists/playlist%201/cover');
    });

    it('stamps the playlist cover URL with updatedAt as epoch millis', () => {
        // The composited 2x2 grid is rebuilt from the playlist's first four
        // track covers at request time, but served `immutable, max-age=1y` from
        // a URL that never changes. Without the stamp, a playlist that gains a
        // track keeps painting its old grid until an HTTP cache is cleared by
        // hand.
        const url = resolveSamoPlaylistArtworkUrl(auth, {
            id: 'playlist 1',
            images: [{ id: 'cover_a' }, { id: 'cover_b' }],
            updatedAt: '2026-07-01T00:00:00Z',
        });

        expect(url).toBe(
            'https://music.example/api/v1/music/playlists/playlist%201/cover?v=1782864000000',
        );
    });

    it('gives a changed playlist a different cover URL and an unchanged one the same URL', () => {
        const playlist = { id: 'pl', images: [{ id: 'a' }, { id: 'b' }] };
        const before = resolveSamoPlaylistArtworkUrl(auth, {
            ...playlist,
            updatedAt: '2026-07-01T00:00:00Z',
        });

        expect(
            resolveSamoPlaylistArtworkUrl(auth, {
                ...playlist,
                updatedAt: '2026-07-01T00:00:00Z',
            }),
        ).toBe(before);
        expect(
            resolveSamoPlaylistArtworkUrl(auth, {
                ...playlist,
                updatedAt: '2026-07-01T00:00:01Z',
            }),
        ).not.toBe(before);
    });

    it('reads two spellings of one instant as the same stamp', () => {
        expect(samoPlaylistCoverVersion({ updatedAt: '2026-07-01T00:00:00Z' })).toBe(
            samoPlaylistCoverVersion({ updatedAt: '2026-07-01T00:00:00+00:00' }),
        );
    });

    it('leaves the URL unstamped when updatedAt is absent or unparseable', () => {
        // Matches SamoCatalogConverters.toEpochMs, which can only return null
        // for these. The Kotlin mirror mapper and this must build the SAME URL
        // for the same playlist, or one grid would be cached under two of them.
        expect(samoPlaylistCoverVersion({})).toBeUndefined();
        expect(samoPlaylistCoverVersion({ updatedAt: '   ' })).toBeUndefined();
        expect(samoPlaylistCoverVersion({ updatedAt: 'whenever' })).toBeUndefined();
        expect(
            resolveSamoPlaylistArtworkUrl(auth, {
                id: 'pl',
                images: [{ id: 'a' }, { id: 'b' }],
                updatedAt: 'whenever',
            }),
        ).toBe('https://music.example/api/v1/music/playlists/pl/cover');
    });

    it('does not stamp a single-cover playlist, whose image id already names its bytes', () => {
        const url = resolveSamoPlaylistArtworkUrl(auth, {
            id: 'pl',
            images: [{ id: 'cover_a' }],
            updatedAt: '2026-07-01T00:00:00Z',
        });

        expect(url).not.toContain('v=');
        expect(url).toContain('cover_a');
    });

    it('survives the width and stream-token passes that run over it afterwards', () => {
        const stamped = resolveSamoPlaylistArtworkUrl(
            auth,
            { id: 'pl', images: [{ id: 'a' }, { id: 'b' }], updatedAt: '2026-07-01T00:00:00Z' },
            'token-1',
        );
        const request = buildSamoAuthenticatedImageRequest(auth, stamped!, 'cache-key', 300);

        expect(request.url).toContain('v=1782864000000');
        expect(request.url).toContain('width=300');
        expect(request.url).not.toContain('stream_token');
    });

    it('flags a multi-cover playlist as a grid and a 0/1-cover one as not', () => {
        expect(samoPlaylistHasCoverGrid({ images: [{ id: 'cover_a' }, { id: 'cover_b' }] })).toBe(
            true,
        );
        expect(samoPlaylistHasCoverGrid({ images: [{ id: 'cover_a' }] })).toBe(false);
        expect(samoPlaylistHasCoverGrid({ images: [] })).toBe(false);
        expect(samoPlaylistHasCoverGrid({ images: undefined })).toBe(false);
    });

    it('authenticates image requests with the bearer and strips any stream token from the URL', () => {
        const request = buildSamoAuthenticatedImageRequest(
            auth,
            'https://music.example/api/v1/media/images/cover_a/image?stream_token=old',
            'cache-key',
        );

        expect(request.headers).toEqual({ Authorization: 'Bearer bearer-token' });
        // The token is what churns cache identity: it is re-minted on a 30 min
        // TTL and dropped on every server restart, so leaving it on the URL
        // gives unchanged artwork a new URL — and a cold cache — several times
        // an hour. The bearer above authenticates the request on its own.
        expect(request.url).not.toContain('stream_token');
    });
});

/**
 * The URL builders these lock used to construct a `URL` object per call (often
 * several per artwork item), which measured as most of a ~1s synchronous block
 * on Home. They build strings now — and these URLs are compared verbatim all
 * over the app (artwork disk-cache keys, queue item identity, the server's own
 * routing), so "same output as the URL object would produce" is a contract,
 * not an implementation detail. The oracle below is exactly the code that was
 * replaced, so any drift fails here rather than on a device.
 */
const buildViaUrlObject = (
    base: string,
    path: string,
    query?: Record<string, boolean | number | string | undefined>,
): string => {
    const url = new URL(path, `${base}/`);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
    }
    return url.toString();
};

describe('samo URL building', () => {
    const cases: Array<[string, string, Record<string, boolean | number | string | undefined>?]> = [
        ['no query', '/api/v1/media/images/cover_a/image', undefined],
        ['a stream token', '/api/v1/media/images/cover_a/image', { stream_token: 'smt_abc123' }],
        [
            'several params in order',
            '/api/v1/audiobooks/b1/stream',
            {
                mediaFileId: 'file-7',
                progressSeconds: 12.5,
                stream_token: 'smt_abc123',
            },
        ],
        [
            'a value needing escapes',
            '/api/v1/music/tracks/t1/stream',
            {
                stream_token: 'a b&c=d/e?f+g!h~i',
            },
        ],
        [
            'an id needing escapes',
            `/api/v1/music/playlists/${encodeURIComponent('playlist 1')}/cover`,
            undefined,
        ],
        ['a boolean and a number', '/api/v1/music/albums', { includeTracks: true, limit: 50 }],
    ];

    for (const [label, path, query] of cases) {
        it(`matches the URL object for ${label}`, () => {
            expect(getSamoApiUrl(auth, path, query)).toBe(buildViaUrlObject(auth.url, path, query));
        });
    }

    it('resolves an absolute API path against the origin, ignoring a base path prefix', () => {
        const prefixed = { ...auth, url: 'https://music.example/subdir' };

        expect(getSamoApiUrl(prefixed, '/media/images/cover_a/image')).toBe(
            buildViaUrlObject('https://music.example/subdir', '/api/v1/media/images/cover_a/image'),
        );
    });

    it('builds the same stream URLs it always did', () => {
        expect(getSamoMetadataImageUrl(auth, 'cover_a', 'smt_1')).toBe(
            buildViaUrlObject(auth.url, '/api/v1/media/images/cover_a/image', {
                stream_token: 'smt_1',
            }),
        );
        expect(getSamoMusicTrackStreamUrl(auth, 'track 1', { streamToken: 'smt_1' })).toBe(
            buildViaUrlObject(auth.url, '/api/v1/music/tracks/track%201/stream', {
                stream_token: 'smt_1',
            }),
        );
        expect(
            getSamoAudiobookStreamUrl(auth, 'b1', {
                mediaFileId: 'f2',
                progressSeconds: 30,
                streamToken: 'smt_1',
            }),
        ).toBe(
            buildViaUrlObject(auth.url, '/api/v1/audiobooks/b1/stream', {
                mediaFileId: 'f2',
                progressSeconds: 30,
                stream_token: 'smt_1',
            }),
        );
    });

    it('returns an already-tokenized URL of ours untouched', () => {
        const url = getSamoMetadataImageUrl(auth, 'cover_a', 'smt_1');

        expect(finalizeSamoMediaUrl(auth, url, 'smt_1')).toBe(url);
    });

    it('rewrites a stale token rather than short-circuiting', () => {
        const stale = getSamoMetadataImageUrl(auth, 'cover_a', 'smt_stale');

        expect(finalizeSamoMediaUrl(auth, stale, 'smt_fresh')).toBe(
            getSamoMetadataImageUrl(auth, 'cover_a', 'smt_fresh'),
        );
    });

    it('re-homes a scan-time API URL on the connected origin, PORT included', () => {
        // The port is the point: the old rewrite assigned `.host`, which
        // leaves an existing port untouched, so this used to come back as
        // `https://music.example:6969/…` — unreachable.
        expect(
            finalizeSamoMediaUrl(
                auth,
                'http://192.168.1.10:6969/api/v1/media/images/cover_a/image',
                'smt_1',
            ),
        ).toBe('https://music.example/api/v1/media/images/cover_a/image?stream_token=smt_1');
    });

    it('leaves a foreign non-API URL alone', () => {
        expect(finalizeSamoMediaUrl(auth, 'https://cdn.example/art/cover.jpg', 'smt_1')).toBe(
            'https://cdn.example/art/cover.jpg',
        );
    });

    it('re-homes a scan-time URL even with NO stream token', () => {
        // The display path passes no token (the bearer header authenticates it),
        // and this used to bail out at the top whenever the token was undefined
        // — silently skipping the re-homing too, so a scan-time address went
        // straight to the image loader and the cover came back blank.
        expect(
            finalizeSamoMediaUrl(
                auth,
                'http://192.168.1.10:6969/api/v1/media/images/cover_a/image',
            ),
        ).toBe('https://music.example/api/v1/media/images/cover_a/image');
    });

    it('strips an embedded token when none is requested', () => {
        // Keeps the result a function of what the CALLER asked for rather than
        // of whatever happened to be baked into the stored URL, so the display
        // path cannot leak a token it deliberately stopped using.
        expect(
            finalizeSamoMediaUrl(auth, getSamoMetadataImageUrl(auth, 'cover_a', 'smt_old')),
        ).toBe(getSamoMetadataImageUrl(auth, 'cover_a'));
    });

    it('returns an already-clean URL of ours untouched when no token is requested', () => {
        const url = getSamoMetadataImageUrl(auth, 'cover_a');

        expect(finalizeSamoMediaUrl(auth, url)).toBe(url);
    });

    it('still leaves a foreign non-API URL alone with no token', () => {
        expect(finalizeSamoMediaUrl(auth, 'https://cdn.example/art/cover.jpg')).toBe(
            'https://cdn.example/art/cover.jpg',
        );
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

    it('keeps paging until it finds the system playlist', async () => {
        // The account has more playlists than one page holds and the
        // server-managed one is not in the first page. A single capped read
        // used to return undefined here, and Explore vanished from every home
        // screen with no error and no empty state to notice.
        const requested: string[] = [];
        const page = (offset: number) => {
            const items = Array.from({ length: 200 }, (_unused, index) => ({
                id: `p${offset + index}`,
                name: `Playlist ${offset + index}`,
            }));
            if (offset === 200) {
                items[57] = { id: 'explo', name: 'Explo', system: true } as never;
            }
            return { items, limit: 200, offset, total: 640 };
        };

        const fetcher: SamoFetch = async (url) => {
            requested.push(url);
            const offset = Number(new URL(url).searchParams.get('offset') ?? 0);
            const body = JSON.stringify(page(offset));
            return {
                json: async () => JSON.parse(body) as unknown,
                ok: true,
                status: 200,
                text: async () => body,
            };
        };

        const explo = await findSamoExploPlaylist(fetcher, auth);

        expect(explo?.id).toBe('explo');
        // Stops at the page that matched rather than walking all 640.
        expect(requested).toHaveLength(2);
    });

    it('stops at the reported total instead of paging forever', async () => {
        let calls = 0;
        const fetcher: SamoFetch = async () => {
            calls += 1;
            const body = JSON.stringify({
                items: Array.from({ length: 200 }, (_unused, index) => ({
                    id: `p${index}`,
                    name: `Playlist ${index}`,
                })),
                limit: 200,
                offset: 0,
                total: 200,
            });
            return {
                json: async () => JSON.parse(body) as unknown,
                ok: true,
                status: 200,
                text: async () => body,
            };
        };

        expect(await findSamoExploPlaylist(fetcher, auth)).toBeUndefined();
        expect(calls).toBe(1);
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

describe('withSamoImageWidth', () => {
    it('asks for a width on samo media URLs', () => {
        expect(
            withSamoImageWidth('https://music.example/api/v1/media/images/cover_a/image', 300),
        ).toBe('https://music.example/api/v1/media/images/cover_a/image?width=300');
    });

    it('appends to a URL that already has a query', () => {
        expect(
            withSamoImageWidth('https://music.example/api/v1/media/images/cover_a/image?x=1', 300),
        ).toBe('https://music.example/api/v1/media/images/cover_a/image?x=1&width=300');
    });

    it('leaves non-samo URLs alone', () => {
        // Podcast art is routinely a third-party CDN URL that knows nothing
        // about this parameter; adding one would only break its cache key.
        const remote = 'https://cdn.example/artwork/3000x3000.jpg';
        expect(withSamoImageWidth(remote, 300)).toBe(remote);
    });

    it('is a no-op without a usable width', () => {
        const url = 'https://music.example/api/v1/media/images/cover_a/image';
        for (const width of [undefined, 0, -10, Number.NaN]) {
            expect(withSamoImageWidth(url, width)).toBe(url);
        }
    });

    it('does not stack widths when called twice', () => {
        const once = withSamoImageWidth(
            'https://music.example/api/v1/media/images/cover_a/image',
            300,
        );
        expect(withSamoImageWidth(once, 512)).toBe(once);
    });

    it('carries the width through the authenticated image request builder', () => {
        const request = buildSamoAuthenticatedImageRequest(
            auth,
            'https://music.example/api/v1/media/images/cover_a/image',
            'cache-key',
            128,
        );
        expect(request.url).toContain('width=128');
        expect(request.headers).toEqual({ Authorization: 'Bearer bearer-token' });
    });
});

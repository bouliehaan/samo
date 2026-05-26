import {
    adaptNativeFetch,
    authenticateSamo,
    createSamoAudiobookBookmark,
    createSamoMusicPlaylist,
    deleteSamoBookmark,
    deleteSamoMusicPlaylist,
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
    getFetch,
    getSamoApiUrl,
    getSamoAudiobook,
    getSamoAudiobookCoverUrl,
    getSamoAudiobookStreamUrl,
    getSamoCatalogOverview,
    getSamoExtractedCoverUrl,
    getSamoMediaImageUrl,
    getSamoMusicAlbum,
    getSamoMusicArtist,
    getSamoMusicBrowse,
    getSamoMusicPlaylist,
    getSamoMusicTrack,
    getSamoMusicTrackStreamUrl,
    getSamoPodcastCoverUrl,
    getSamoPodcastEpisodeStreamUrl,
    getSamoPodcastShow,
    listSamoAudiobookBookmarks,
    listSamoAudiobooks,
    listSamoBookmarks,
    listSamoInternetRadioStations,
    listSamoMusicAlbums,
    listSamoMusicArtistAlbums,
    listSamoMusicArtists,
    listSamoMusicGenres,
    listSamoMusicPlaylists,
    listSamoMusicPlaylistTracks,
    listSamoMusicTracks,
    listSamoPodcastEpisodes,
    listSamoPodcasts,
    patchSamoPlayback,
    resolveSamoAlbumArtworkUrl,
    resolveSamoArtistArtworkUrl,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    samoItemsOf,
    type SamoMusicAlbum,
    type SamoMusicArtist,
    type SamoMusicTrack,
    type SamoPaginatedResponse,
    updateSamoMusicPlaylist,
} from '@samo/core/server';

import { samoNormalize } from '/@/shared/api/samo/samo-normalize';
import {
    type AlbumArtist,
    type AlbumDetailResponse,
    type AlbumListResponse,
    type AlbumListSort,
    type CreatePlaylistResponse,
    type InternalControllerEndpoint,
    LibraryItem,
    type Playlist,
    type PlaylistDetailResponse,
    ServerType,
    type Song,
    type SongListResponse,
    SortOrder,
} from '/@/shared/types/domain-types';

const browserFetch = getFetch(adaptNativeFetch(fetch));

// Some Samo endpoints page in chunks of 500 to avoid pulling enormous lists
// at once. Mirrors the Android `mobile-home` collection loaders.
const SAMO_PAGE_SIZE = 500;
const SAMO_MAX_PAGES = 40;

const samoAuthentication = (server: {
    credential: string;
    ndCredential?: string;
    url: string;
}) => ({
    credential: server.credential,
    ndCredential: server.ndCredential,
    type: ServerType.SAMO as const,
    url: server.url,
});

/**
 * Route a renderer-supplied image ID to the correct samo image endpoint
 * based on its prefix. Samo's `imageId` field on normalized entities is
 * either a `cover_*` (extracted cover) or `image_*` (raw catalog image).
 * Entity-level IDs (`album_*`, `artist_*`, `playlist_*`) can't resolve to
 * artwork directly — `/api/v1/music/albums/{id}/cover` returns 404 and
 * there's no equivalent for artists/playlists. Audiobook and podcast IDs
 * resolve through their own cover endpoints.
 */
const resolveSamoImageUrlFromQueryId = (
    auth: { credential: string; ndCredential?: string; url: string },
    id: string | undefined,
    streamToken: string | undefined,
    _itemType: LibraryItem | undefined,
): string | undefined => {
    if (!id) return undefined;
    if (id.startsWith('cover_')) {
        return getSamoExtractedCoverUrl(auth, id, streamToken);
    }
    if (id.startsWith('image_')) {
        return getSamoMediaImageUrl(auth, id, streamToken);
    }
    if (id.startsWith('podcast_')) {
        return getSamoPodcastCoverUrl(auth, id, streamToken);
    }
    // Audiobooks ship as `item_*` IDs in the catalog; the spec's
    // `audiobook_*` prefix doesn't appear on the wire. Either is wired to
    // /api/v1/audiobooks/{id}/cover on the server.
    if (id.startsWith('audiobook_') || id.startsWith('item_')) {
        return getSamoAudiobookCoverUrl(auth, id, streamToken);
    }
    return undefined;
};

const ensureStreamTokenForServer = async (server: {
    credential: string;
    ndCredential?: string;
    url: string;
}): Promise<string | undefined> => {
    const auth = {
        capabilities: { content: [], search: [] },
        credential: server.credential,
        details: '',
        kind: 'samo-token' as const,
        ndCredential: server.ndCredential,
        title: '',
        type: ServerType.SAMO as const,
        url: server.url,
        username: '',
    };
    try {
        return await ensureSamoStreamToken(auth, browserFetch);
    } catch {
        return getCachedSamoStreamToken(auth);
    }
};

const paginate = <T>(
    items: T[],
    startIndex: number | undefined,
    limit: number | undefined,
): { items: T[]; startIndex: number; total: number } => {
    const total = items.length;
    const offset = startIndex ?? 0;
    const slice = limit ? items.slice(offset, offset + limit) : items.slice(offset);
    return { items: slice, startIndex: offset, total };
};

const sortAlbums = (
    items: SamoMusicAlbum[],
    sortBy: AlbumListSort | undefined,
    sortOrder: SortOrder | undefined,
): SamoMusicAlbum[] => {
    const order = sortOrder === SortOrder.DESC ? -1 : 1;
    const list = [...items];
    switch (sortBy) {
        case 'name' as AlbumListSort:
            list.sort(
                (a, b) => (a.sortName ?? a.title).localeCompare(b.sortName ?? b.title) * order,
            );
            break;
        case 'playCount' as AlbumListSort:
            list.sort(
                (a, b) => ((a.playback?.playCount ?? 0) - (b.playback?.playCount ?? 0)) * order,
            );
            break;
        case 'random' as AlbumListSort:
            list.sort(() => Math.random() - 0.5);
            break;
        case 'recentlyAdded' as AlbumListSort:
            list.sort((a, b) => {
                const aTime = Date.parse(a.addedAt ?? '') || 0;
                const bTime = Date.parse(b.addedAt ?? '') || 0;
                return (aTime - bTime) * order * -1;
            });
            break;
        case 'releaseDate' as AlbumListSort:
        case 'year' as AlbumListSort:
            list.sort((a, b) => ((a.releaseYear ?? 0) - (b.releaseYear ?? 0)) * order);
            break;
        default:
            break;
    }
    return list;
};

const sortArtists = (
    items: SamoMusicArtist[],
    sortOrder: SortOrder | undefined,
): SamoMusicArtist[] => {
    const order = sortOrder === SortOrder.DESC ? -1 : 1;
    return [...items].sort(
        (a, b) => (a.sortName ?? a.name).localeCompare(b.sortName ?? b.name) * order,
    );
};

const sortSongs = (items: SamoMusicTrack[]): SamoMusicTrack[] => {
    return [...items].sort((a, b) => {
        const aDisc = a.discNumber ?? 1;
        const bDisc = b.discNumber ?? 1;
        if (aDisc !== bDisc) return aDisc - bDisc;
        return (a.trackNumber ?? 0) - (b.trackNumber ?? 0);
    });
};

const fetchAllPages = async <T>(
    loader: (input: { limit: number; offset: number }) => Promise<SamoPaginatedResponse<T>>,
): Promise<T[]> => {
    const all: T[] = [];
    for (let page = 0; page < SAMO_MAX_PAGES; page += 1) {
        const response = await loader({
            limit: SAMO_PAGE_SIZE,
            offset: page * SAMO_PAGE_SIZE,
        });
        const batch = samoItemsOf(response);
        if (batch.length === 0) break;
        all.push(...batch);
        if (typeof response.total === 'number') {
            if (all.length >= response.total) break;
        }
        if (batch.length < SAMO_PAGE_SIZE) break;
    }
    return all;
};

export const SamoController: Partial<InternalControllerEndpoint> = {
    addToPlaylist: async ({ apiClientProps, body, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const current = await listSamoMusicPlaylistTracks(browserFetch, auth, query.id, {
            limit: 500,
        });
        const existing = samoItemsOf(current)
            .map((track) => track.id)
            .filter(Boolean) as string[];
        const merged = [...existing];
        for (const id of body.songId) {
            if (!merged.includes(id)) merged.push(id);
        }
        await updateSamoMusicPlaylist(browserFetch, auth, query.id, { trackIds: merged });
        return null;
    },

    authenticate: async (url, body) => {
        const result = await authenticateSamo({
            deviceLabel: 'Samo desktop',
            fetch: browserFetch,
            password: body.password,
            url,
            username: body.username,
        });
        return {
            credential: result.credential,
            isAdmin: result.isAdmin,
            ndCredential: result.ndCredential,
            userId: result.userId ?? null,
            username: result.username,
        };
    },

    createFavorite: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const kind =
            query.type === LibraryItem.ALBUM
                ? 'music-album'
                : query.type === LibraryItem.ALBUM_ARTIST || query.type === LibraryItem.ARTIST
                  ? 'music-artist'
                  : 'music-track';
        await Promise.all(
            query.id.map((id) =>
                patchSamoPlayback(browserFetch, auth, kind, id, { favorite: true }),
            ),
        );
        return null;
    },

    createInternetRadioStation: async () => {
        // Internet radio station creation is admin-only on samo and uses a
        // different request shape than the Subsonic equivalent. Surfaced via
        // a dedicated samo route later — for now the renderer's
        // music-focused dialog only invokes this on Subsonic/Navidrome.
        throw new Error('Internet radio station creation is not wired for Samo yet.');
    },

    createPlaylist: async ({ apiClientProps, body }): Promise<CreatePlaylistResponse> => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const playlist = await createSamoMusicPlaylist(browserFetch, auth, {
            description: body.comment,
            name: body.name,
            public: body.public ?? false,
            trackIds: body._custom?.navidrome?.songIds,
        });
        return { id: playlist.id };
    },

    deleteFavorite: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const kind =
            query.type === LibraryItem.ALBUM
                ? 'music-album'
                : query.type === LibraryItem.ALBUM_ARTIST || query.type === LibraryItem.ARTIST
                  ? 'music-artist'
                  : 'music-track';
        await Promise.all(
            query.id.map((id) =>
                patchSamoPlayback(browserFetch, auth, kind, id, { favorite: false }),
            ),
        );
        return null;
    },

    deleteInternetRadioStation: async () => {
        throw new Error('Internet radio station deletion is not wired for Samo yet.');
    },

    deletePlaylist: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        await deleteSamoMusicPlaylist(browserFetch, auth, query.id);
        return null;
    },

    getAlbumArtistDetail: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const [artist, albums] = await Promise.all([
            getSamoMusicArtist(browserFetch, auth, query.id),
            listSamoMusicArtistAlbums(browserFetch, auth, query.id, { limit: 500 }),
        ]);
        const normalized = samoNormalize.albumArtist(
            artist,
            server,
            LibraryItem.ALBUM_ARTIST,
        ) as AlbumArtist;

        return {
            ...normalized,
            albums: samoItemsOf(albums).map((album) => samoNormalize.album(album, server)),
            similarArtists: null,
        };
    },

    getAlbumArtistInfo: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return null;
        const auth = samoAuthentication(server);
        const artist = await getSamoMusicArtist(browserFetch, auth, query.id);

        if (!artist.biography && !artist.images?.length && !artist.links?.length) {
            return null;
        }

        return {
            biography: artist.biography || null,
            similarArtists: null,
        };
    },

    getAlbumArtistList: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const all = await fetchAllPages<SamoMusicArtist>((input) =>
            listSamoMusicArtists(browserFetch, auth, input),
        );

        let filtered = all;
        if (query.searchTerm) {
            const needle = query.searchTerm.toLowerCase();
            filtered = filtered.filter((artist) => artist.name.toLowerCase().includes(needle));
        }
        if (query.favorite) {
            filtered = filtered.filter((artist) => artist.playback?.favorite);
        }

        const sorted = sortArtists(filtered, query.sortOrder);
        const page = paginate(sorted, query.startIndex, query.limit);

        return {
            items: page.items.map(
                (artist) =>
                    samoNormalize.albumArtist(
                        artist,
                        server,
                        LibraryItem.ALBUM_ARTIST,
                    ) as AlbumArtist,
            ),
            startIndex: page.startIndex,
            totalRecordCount: page.total,
        };
    },

    getAlbumArtistListCount: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return 0;
        const auth = samoAuthentication(server);
        const all = await fetchAllPages<SamoMusicArtist>((input) =>
            listSamoMusicArtists(browserFetch, auth, input),
        );
        let filtered = all;
        if (query.searchTerm) {
            const needle = query.searchTerm.toLowerCase();
            filtered = filtered.filter((artist) => artist.name.toLowerCase().includes(needle));
        }
        if (query.favorite) {
            filtered = filtered.filter((artist) => artist.playback?.favorite);
        }
        return filtered.length;
    },

    getAlbumDetail: async ({ apiClientProps, query }): Promise<AlbumDetailResponse> => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const album = await getSamoMusicAlbum(browserFetch, auth, query.id);
        return samoNormalize.album(album, server);
    },

    getAlbumList: async ({ apiClientProps, query }): Promise<AlbumListResponse> => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);

        let albums: SamoMusicAlbum[];

        if (query.favorite) {
            const browse = await getSamoMusicBrowse(browserFetch, auth, 'favorites', {
                limit: query.limit ?? 200,
            });
            albums = samoItemsOf(
                browse.albums as SamoPaginatedResponse<SamoMusicAlbum> | undefined,
            );
        } else if (query.artistIds && query.artistIds.length > 0) {
            const results = await Promise.all(
                query.artistIds.map((artistId) =>
                    listSamoMusicArtistAlbums(browserFetch, auth, artistId, { limit: 500 }).then(
                        (response) => samoItemsOf(response),
                    ),
                ),
            );
            albums = results.flat();
        } else {
            albums = await fetchAllPages<SamoMusicAlbum>((input) =>
                listSamoMusicAlbums(browserFetch, auth, input),
            );
        }

        let filtered = albums;
        if (query.searchTerm) {
            const needle = query.searchTerm.toLowerCase();
            filtered = filtered.filter((album) => album.title.toLowerCase().includes(needle));
        }
        if (typeof query.minYear === 'number') {
            filtered = filtered.filter(
                (album) => (album.releaseYear ?? album.originalReleaseYear ?? 0) >= query.minYear!,
            );
        }
        if (typeof query.maxYear === 'number') {
            filtered = filtered.filter(
                (album) => (album.releaseYear ?? album.originalReleaseYear ?? 0) <= query.maxYear!,
            );
        }

        const sorted = sortAlbums(filtered, query.sortBy, query.sortOrder);
        const page = paginate(sorted, query.startIndex, query.limit);

        return {
            items: page.items.map((album) => samoNormalize.album(album, server)),
            startIndex: page.startIndex,
            totalRecordCount: page.total,
        };
    },

    getAlbumListCount: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return 0;
        const auth = samoAuthentication(server);
        const all = await fetchAllPages<SamoMusicAlbum>((input) =>
            listSamoMusicAlbums(browserFetch, auth, input),
        );
        if (query.searchTerm) {
            const needle = query.searchTerm.toLowerCase();
            return all.filter((album) => album.title.toLowerCase().includes(needle)).length;
        }
        return all.length;
    },

    getAlbumRadio: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return [];
        const auth = samoAuthentication(server);
        const album = await getSamoMusicAlbum(browserFetch, auth, query.albumId);
        return (album.tracks ?? []).map((track) =>
            samoNormalize.song(track, server, { albumName: album.title }),
        );
    },

    getArtistList: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const all = await fetchAllPages<SamoMusicArtist>((input) =>
            listSamoMusicArtists(browserFetch, auth, input),
        );

        let filtered = all;
        if (query.searchTerm) {
            const needle = query.searchTerm.toLowerCase();
            filtered = filtered.filter((artist) => artist.name.toLowerCase().includes(needle));
        }

        const sorted = sortArtists(filtered, query.sortOrder);
        const page = paginate(sorted, query.startIndex, query.limit);

        return {
            items: page.items.map(
                (artist) =>
                    samoNormalize.albumArtist(
                        artist,
                        server,
                        LibraryItem.ALBUM_ARTIST,
                    ) as AlbumArtist,
            ),
            startIndex: page.startIndex,
            totalRecordCount: page.total,
        };
    },

    getArtistListCount: async ({ apiClientProps }) => {
        const server = apiClientProps.server;
        if (!server) return 0;
        const auth = samoAuthentication(server);
        const all = await fetchAllPages<SamoMusicArtist>((input) =>
            listSamoMusicArtists(browserFetch, auth, input),
        );
        return all.length;
    },

    getArtistRadio: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return [];
        const auth = samoAuthentication(server);
        const albums = await listSamoMusicArtistAlbums(browserFetch, auth, query.artistId, {
            limit: 5,
        });
        const tracks: Song[] = [];
        for (const album of samoItemsOf(albums)) {
            const fullAlbum = await getSamoMusicAlbum(browserFetch, auth, album.id);
            for (const track of fullAlbum.tracks ?? []) {
                tracks.push(samoNormalize.song(track, server, { albumName: fullAlbum.title }));
            }
            if (query.count && tracks.length >= query.count) break;
        }
        return query.count ? tracks.slice(0, query.count) : tracks;
    },

    getDownloadUrl: ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return '';
        const auth = samoAuthentication(server);
        const streamToken = getCachedSamoStreamToken(auth);
        return getSamoMusicTrackStreamUrl(auth, query.id, { streamToken });
    },

    getGenreList: async ({ apiClientProps }) => {
        const server = apiClientProps.server;
        if (!server) {
            return { items: [], startIndex: 0, totalRecordCount: 0 };
        }
        const auth = samoAuthentication(server);
        const response = await listSamoMusicGenres(browserFetch, auth);
        const items = samoItemsOf(response);
        return {
            items: items.map((genre) => ({
                _itemType: LibraryItem.GENRE,
                _serverId: server.id,
                _serverType: ServerType.SAMO,
                albumCount: null,
                id: genre.id ?? genre.name ?? '',
                imageId: null,
                imageUrl: null,
                name: genre.name ?? '',
                songCount: null,
            })),
            startIndex: 0,
            totalRecordCount: items.length,
        };
    },

    getImageRequest: ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return null;
        const auth = samoAuthentication(server);
        const streamToken = getCachedSamoStreamToken(auth);
        const url = resolveSamoImageUrlFromQueryId(auth, query.id, streamToken, query.itemType);
        if (!url) return null;

        return {
            cacheKey: ['samo', server.id, query.id, query.size ?? ''].join(':'),
            url,
        };
    },

    getImageUrl: ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return null;
        const auth = samoAuthentication(server);
        const streamToken = getCachedSamoStreamToken(auth);
        return resolveSamoImageUrlFromQueryId(auth, query.id, streamToken, query.itemType) ?? null;
    },

    getInternetRadioStations: async ({ apiClientProps }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const response = await listSamoInternetRadioStations(browserFetch, auth, { limit: 500 });
        return samoItemsOf(response).map((station) =>
            samoNormalize.internetRadioStation(station, server),
        );
    },

    getMusicFolderList: async ({ apiClientProps }) => {
        const server = apiClientProps.server;
        if (!server) {
            return { items: [], startIndex: 0, totalRecordCount: 0 };
        }
        // Samo libraries are admin-managed. Surface them as music folders so
        // the renderer's multi-folder filter UI can scope queries. Falls back
        // to a single empty selection if the call fails.
        try {
            const response = await browserFetch(
                getSamoApiUrl(samoAuthentication(server), '/libraries'),
                {
                    headers: { Authorization: `Bearer ${server.credential}` },
                    method: 'GET',
                },
            );
            if (!response.ok) {
                return { items: [], startIndex: 0, totalRecordCount: 0 };
            }
            const body = (await response.json()) as {
                items?: Array<{ id: string; kind?: string; name: string }>;
            };
            const items = (body.items ?? [])
                .filter((library) => library.kind !== 'audiobook' && library.kind !== 'podcast')
                .map((library) => ({ id: library.id, name: library.name }));
            return {
                items,
                startIndex: 0,
                totalRecordCount: items.length,
            };
            // MusicFolder includes the `name` field — see domain-types.ts:293.
        } catch {
            return { items: [], startIndex: 0, totalRecordCount: 0 };
        }
    },

    getPlaylistDetail: async ({ apiClientProps, query }): Promise<PlaylistDetailResponse> => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const playlist = await getSamoMusicPlaylist(browserFetch, auth, query.id);
        return samoNormalize.playlist(playlist, server);
    },

    getPlaylistList: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const response = await listSamoMusicPlaylists(browserFetch, auth, {
            limit: query.limit ?? 200,
            offset: query.startIndex ?? 0,
        });
        const items: Playlist[] = samoItemsOf(response).map((playlist) =>
            samoNormalize.playlist(playlist, server),
        );

        return {
            items,
            startIndex: query.startIndex ?? 0,
            totalRecordCount: response.total ?? items.length,
        };
    },

    getPlaylistListCount: async ({ apiClientProps }) => {
        const server = apiClientProps.server;
        if (!server) return 0;
        const auth = samoAuthentication(server);
        const response = await listSamoMusicPlaylists(browserFetch, auth, { limit: 1 });
        return response.total ?? samoItemsOf(response).length;
    },

    getPlaylistSongList: async ({ apiClientProps, query }): Promise<SongListResponse> => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const response = await listSamoMusicPlaylistTracks(browserFetch, auth, query.id, {
            limit: 500,
        });
        const items: Song[] = samoItemsOf(response).map((track, index) =>
            samoNormalize.song(track, server, { playlistIndex: index }),
        );
        return {
            items,
            startIndex: 0,
            totalRecordCount: response.total ?? items.length,
        };
    },

    getRandomSongList: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const response = await listSamoMusicTracks(browserFetch, auth, {
            limit: (query.limit ?? 50) * 4,
        });
        const items = samoItemsOf(response);
        const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, query.limit ?? 50);
        return {
            items: shuffled.map((track) => samoNormalize.song(track, server)),
            startIndex: 0,
            totalRecordCount: shuffled.length,
        };
    },

    getRoles: async () => ['admin', 'user'],

    getServerInfo: async () => ({
        features: {},
        version: 'samo',
    }),

    getSimilarSongs: async () => [],

    getSongDetail: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const track = await getSamoMusicTrack(browserFetch, auth, query.id);
        return samoNormalize.song(track, server);
    },

    getSongList: async ({ apiClientProps, query }): Promise<SongListResponse> => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);

        let tracks: SamoMusicTrack[] = [];

        if (query.albumIds && query.albumIds.length > 0) {
            const albumsTracks = await Promise.all(
                query.albumIds.map((albumId) => getSamoMusicAlbum(browserFetch, auth, albumId)),
            );
            tracks = albumsTracks.flatMap((album) =>
                (album.tracks ?? []).map((track) => ({
                    ...track,
                    albumId: track.albumId ?? album.id,
                    albumTitle: track.albumTitle ?? album.title,
                })),
            );
            tracks = sortSongs(tracks);
        } else if (query.favorite) {
            const browse = await getSamoMusicBrowse(browserFetch, auth, 'favorites', {
                limit: query.limit ?? 500,
            });
            tracks = samoItemsOf(
                browse.tracks as SamoPaginatedResponse<SamoMusicTrack> | undefined,
            );
        } else {
            const response = await listSamoMusicTracks(browserFetch, auth, {
                limit: query.limit ?? 500,
                offset: query.startIndex ?? 0,
            });
            tracks = samoItemsOf(response);
        }

        if (query.searchTerm) {
            const needle = query.searchTerm.toLowerCase();
            tracks = tracks.filter(
                (track) =>
                    track.title.toLowerCase().includes(needle) ||
                    (track.displayArtist ?? '').toLowerCase().includes(needle) ||
                    (track.albumTitle ?? '').toLowerCase().includes(needle),
            );
        }

        const page = paginate(tracks, query.startIndex, query.limit);
        return {
            items: page.items.map((track) => samoNormalize.song(track, server)),
            startIndex: page.startIndex,
            totalRecordCount: page.total,
        };
    },

    getSongListCount: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return 0;
        const auth = samoAuthentication(server);
        if (query.albumIds && query.albumIds.length > 0) {
            const albums = await Promise.all(
                query.albumIds.map((id) => getSamoMusicAlbum(browserFetch, auth, id)),
            );
            return albums.reduce((sum, album) => sum + (album.tracks?.length ?? 0), 0);
        }
        const response = await listSamoMusicTracks(browserFetch, auth, { limit: 1 });
        return response.total ?? 0;
    },

    getStreamUrl: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return '';
        const auth = samoAuthentication(server);
        const streamToken = await ensureStreamTokenForServer(server);

        if (query.mediaType === 'podcast') {
            return getSamoPodcastEpisodeStreamUrl(auth, query.id, {
                offsetSeconds: query.offset,
                streamToken,
            });
        }

        return getSamoMusicTrackStreamUrl(auth, query.id, {
            offsetSeconds: query.offset,
            streamToken,
        });
    },

    getTopSongs: async () => ({ items: [], startIndex: 0, totalRecordCount: 0 }),

    getUserInfo: async ({ apiClientProps }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        try {
            const response = await browserFetch(getSamoApiUrl(auth, '/users/me'), {
                headers: { Authorization: `Bearer ${server.credential}` },
                method: 'GET',
            });
            if (!response.ok) {
                return {
                    id: server.userId ?? '',
                    isAdmin: server.isAdmin ?? false,
                    name: server.username ?? '',
                };
            }
            const body = (await response.json()) as {
                displayName?: string;
                id?: string;
                role?: string;
                username?: string;
            };
            return {
                id: body.id ?? server.userId ?? '',
                isAdmin: body.role === 'admin',
                name: body.displayName ?? body.username ?? server.username ?? '',
            };
        } catch {
            return {
                id: server.userId ?? '',
                isAdmin: server.isAdmin ?? false,
                name: server.username ?? '',
            };
        }
    },

    removeFromPlaylist: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const current = await listSamoMusicPlaylistTracks(browserFetch, auth, query.id, {
            limit: 500,
        });
        const ids = samoItemsOf(current)
            .map((track) => track.id)
            .filter(Boolean) as string[];
        const removeSet = new Set(query.songId);
        const merged = ids.filter((id) => !removeSet.has(id));
        await updateSamoMusicPlaylist(browserFetch, auth, query.id, { trackIds: merged });
        return null;
    },

    replacePlaylist: async ({ apiClientProps, body, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        await updateSamoMusicPlaylist(browserFetch, auth, query.id, {
            trackIds: body.songId,
        });
        return null;
    },

    savePlayQueue: async () => {
        // Samo has no server play queue surface yet.
    },

    scrobble: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) return null;
        const auth = samoAuthentication(server);

        // Pause / unpause / start / timeupdate all collapse to a Samo
        // playback PATCH. We treat any non-`submission` event as a position
        // update; `submission=true` increments the play count.
        await patchSamoPlayback(browserFetch, auth, 'music-track', query.id, {
            ...(query.submission ? { incrementPlayCount: true } : {}),
            ...(typeof query.position === 'number'
                ? { progressSeconds: Math.round(query.position) }
                : {}),
            touchLastPlayedAt: query.submission || query.event === 'start',
            touchLastPositionAt: true,
        });
        return null;
    },

    search: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server || !query.query) {
            return { albumArtists: [], albums: [], songs: [] };
        }
        const auth = samoAuthentication(server);
        const response = await browserFetch(
            getSamoApiUrl(auth, '/music/search', { limit: query.songLimit, q: query.query }),
            {
                headers: { Authorization: `Bearer ${server.credential}` },
                method: 'GET',
            },
        );
        if (!response.ok) {
            throw new Error(`Samo search failed (${response.status})`);
        }
        const body = (await response.json()) as {
            albums?: SamoMusicAlbum[];
            artists?: SamoMusicArtist[];
            tracks?: SamoMusicTrack[];
        };

        return {
            albumArtists: (body.artists ?? []).map(
                (artist) => samoNormalize.albumArtist(artist, server) as AlbumArtist,
            ),
            albums: (body.albums ?? []).map((album) => samoNormalize.album(album, server)),
            songs: (body.tracks ?? []).map((track) => samoNormalize.song(track, server)),
        };
    },

    setPlaylistSongs: async ({ apiClientProps, body }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        await updateSamoMusicPlaylist(browserFetch, auth, body.id, {
            trackIds: body.songIds,
        });
        return null;
    },

    setRating: async ({ apiClientProps, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        const kind =
            query.type === LibraryItem.ALBUM
                ? 'music-album'
                : query.type === LibraryItem.ALBUM_ARTIST || query.type === LibraryItem.ARTIST
                  ? 'music-artist'
                  : 'music-track';
        await Promise.all(
            query.id.map((id) =>
                patchSamoPlayback(browserFetch, auth, kind, id, { rating: query.rating }),
            ),
        );
        return null;
    },

    updateInternetRadioStation: async () => {
        throw new Error('Internet radio station updates are not wired for Samo yet.');
    },

    updatePlaylist: async ({ apiClientProps, body, query }) => {
        const server = apiClientProps.server;
        if (!server) throw new Error('No server');
        const auth = samoAuthentication(server);
        await updateSamoMusicPlaylist(browserFetch, auth, query.id, {
            description: body.comment,
            name: body.name,
            public: body.public,
        });
        return null;
    },
};

/**
 * Bonus surface for the electron renderer to pull samo-specific data
 * (audiobooks, podcasts, bookmarks, listening sessions) without forcing those
 * concepts into the music-focused ControllerEndpoint. Screens can call
 * `samoExtras.getAudiobook(...)` etc. directly.
 */
export const samoExtras = {
    createBookmark: async (
        server: { credential: string; ndCredential?: string; url: string },
        audiobookId: string,
        body: { chapterId?: string; note?: string; positionSeconds?: number; title?: string },
    ) => createSamoAudiobookBookmark(browserFetch, samoAuthentication(server), audiobookId, body),

    deleteBookmark: async (
        server: { credential: string; ndCredential?: string; url: string },
        id: string,
    ) => deleteSamoBookmark(browserFetch, samoAuthentication(server), id),

    getAudiobook: async (
        server: { credential: string; ndCredential?: string; url: string },
        id: string,
    ) => getSamoAudiobook(browserFetch, samoAuthentication(server), id),

    getAudiobookBookmarks: async (
        server: { credential: string; ndCredential?: string; url: string },
        audiobookId: string,
    ) => listSamoAudiobookBookmarks(browserFetch, samoAuthentication(server), audiobookId),

    getAudiobookCoverUrl: async (
        server: { credential: string; ndCredential?: string; url: string },
        audiobookId: string,
    ) => {
        const auth = samoAuthentication(server);
        const streamToken = await ensureStreamTokenForServer(server);
        return getSamoAudiobookStreamUrl(auth, audiobookId, { streamToken });
    },

    getBookmarks: async (
        server: { credential: string; ndCredential?: string; url: string },
        limit?: number,
    ) => listSamoBookmarks(browserFetch, samoAuthentication(server), { limit }),

    getCatalogOverview: async (server: {
        credential: string;
        ndCredential?: string;
        url: string;
    }) => getSamoCatalogOverview(browserFetch, samoAuthentication(server)),

    getPodcastEpisodes: async (
        server: { credential: string; ndCredential?: string; url: string },
        showId: string,
    ) => listSamoPodcastEpisodes(browserFetch, samoAuthentication(server), showId, { limit: 500 }),

    getPodcastShow: async (
        server: { credential: string; ndCredential?: string; url: string },
        id: string,
    ) => getSamoPodcastShow(browserFetch, samoAuthentication(server), id),

    listAudiobooks: async (
        server: { credential: string; ndCredential?: string; url: string },
        input?: { limit?: number; offset?: number },
    ) => listSamoAudiobooks(browserFetch, samoAuthentication(server), input),

    listPodcasts: async (
        server: { credential: string; ndCredential?: string; url: string },
        input?: { limit?: number; offset?: number },
    ) => listSamoPodcasts(browserFetch, samoAuthentication(server), input),

    resolveAlbumArtworkUrl: (
        server: { credential: string; ndCredential?: string; url: string },
        album: SamoMusicAlbum,
    ) =>
        resolveSamoAlbumArtworkUrl(
            samoAuthentication(server),
            album,
            getCachedSamoStreamToken(samoAuthentication(server)),
        ),

    resolveArtistArtworkUrl: (
        server: { credential: string; ndCredential?: string; url: string },
        artist: SamoMusicArtist,
    ) =>
        resolveSamoArtistArtworkUrl(
            samoAuthentication(server),
            artist,
            getCachedSamoStreamToken(samoAuthentication(server)),
        ),

    resolveAudiobookArtworkUrl: (
        server: { credential: string; ndCredential?: string; url: string },
        audiobook: {
            cover?: SamoMusicAlbum['images'] extends Array<infer T> ? T : never;
            id: string;
        },
    ) =>
        resolveSamoAudiobookArtworkUrl(
            samoAuthentication(server),
            audiobook,
            getCachedSamoStreamToken(samoAuthentication(server)),
        ),

    resolvePodcastArtworkUrl: (
        server: { credential: string; ndCredential?: string; url: string },
        podcast: {
            cover?: SamoMusicAlbum['images'] extends Array<infer T> ? T : never;
            id: string;
        },
    ) =>
        resolveSamoPodcastArtworkUrl(
            samoAuthentication(server),
            podcast,
            getCachedSamoStreamToken(samoAuthentication(server)),
        ),
};

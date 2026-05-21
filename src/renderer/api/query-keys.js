export const splitPaginatedQuery = (key) => {
    const { limit, startIndex, ...filter } = key || {};
    if (startIndex !== undefined || limit !== undefined) {
        return {
            filter,
            pagination: {
                limit,
                startIndex,
            },
        };
    }
    return {
        filter,
        pagination: undefined,
    };
};
export const queryKeys = {
    albumArtists: {
        count: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'albumArtists', 'count', filter, pagination];
            }
            if (query) {
                return [serverId, 'albumArtists', 'count', filter];
            }
            return [serverId, 'albumArtists', 'count'];
        },
        detail: (serverId, query) => {
            if (query) {
                return [serverId, 'albumArtists', 'detail', query];
            }
            return [serverId, 'albumArtists', 'detail'];
        },
        favoriteSongs: (serverId, artistId) => {
            if (artistId) {
                return [serverId, 'albumArtists', 'favoriteSongs', artistId];
            }
            return [serverId, 'albumArtists', 'favoriteSongs'];
        },
        infiniteList: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'albumArtists', 'infiniteList', filter, pagination];
            }
            if (query) {
                return [serverId, 'albumArtists', 'infiniteList', filter];
            }
            return [serverId, 'albumArtists', 'infiniteList'];
        },
        info: (serverId, query) => {
            if (query) {
                return [serverId, 'albumArtists', 'info', query];
            }
            return [serverId, 'albumArtists', 'info'];
        },
        list: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'albumArtists', 'list', filter, pagination];
            }
            if (query) {
                return [serverId, 'albumArtists', 'list', filter];
            }
            return [serverId, 'albumArtists', 'list'];
        },
        root: (serverId) => [serverId, 'albumArtists'],
        topSongs: (serverId, query) => {
            if (query)
                return [serverId, 'albumArtists', 'topSongs', query];
            return [serverId, 'albumArtists', 'topSongs'];
        },
    },
    albums: {
        count: (serverId, query, artistId) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination && artistId) {
                return [serverId, 'albums', 'count', artistId, filter, pagination];
            }
            if (query && pagination) {
                return [serverId, 'albums', 'count', filter, pagination];
            }
            if (query && artistId) {
                return [serverId, 'albums', 'count', artistId, filter];
            }
            if (query) {
                return [serverId, 'albums', 'count', filter];
            }
            return [serverId, 'albums', 'count'];
        },
        detail: (serverId, query) => {
            if (query) {
                return [serverId, 'albums', 'detail', query];
            }
            return [serverId, 'albums', 'detail'];
        },
        infiniteList: (serverId, query, artistId) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination && artistId) {
                return [serverId, 'albums', 'infiniteList', artistId, filter, pagination];
            }
            if (query && pagination) {
                return [serverId, 'albums', 'infiniteList', filter, pagination];
            }
            if (query && artistId) {
                return [serverId, 'albums', 'infiniteList', artistId, filter];
            }
            if (query) {
                return [serverId, 'albums', 'infiniteList', filter];
            }
            return [serverId, 'albums', 'infiniteList'];
        },
        list: (serverId, query, artistId) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination && artistId) {
                return [serverId, 'albums', 'list', artistId, filter, pagination];
            }
            if (query && pagination) {
                return [serverId, 'albums', 'list', filter, pagination];
            }
            if (query && artistId) {
                return [serverId, 'albums', 'list', artistId, filter];
            }
            if (query) {
                return [serverId, 'albums', 'list', filter];
            }
            return [serverId, 'albums', 'list'];
        },
        related: (serverId, id, query) => {
            if (query) {
                return [serverId, 'albums', id, 'related', query];
            }
            return [serverId, 'albums', id, 'related'];
        },
        root: (serverId) => [serverId, 'albums'],
        serverRoot: (serverId) => [serverId, 'albums'],
        songs: (serverId, query) => [serverId, 'albums', 'songs', query],
    },
    artists: {
        count: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'artists', 'count', filter, pagination];
            }
            if (query) {
                return [serverId, 'artists', 'count', filter];
            }
            return [serverId, 'artists', 'count'];
        },
        infiniteList: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'artists', 'infiniteList', filter, pagination];
            }
            if (query) {
                return [serverId, 'artists', 'infiniteList', filter];
            }
            return [serverId, 'artists', 'infiniteList'];
        },
        list: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'artists', 'list', filter, pagination];
            }
            if (query) {
                return [serverId, 'artists', 'list', filter];
            }
            return [serverId, 'artists', 'list'];
        },
        root: (serverId) => [serverId, 'artists'],
    },
    folders: {
        folder: (serverId, query) => {
            if (query) {
                return [serverId, 'folders', 'folder', query];
            }
            return [serverId, 'folders', 'folder'];
        },
    },
    genres: {
        count: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'genres', 'count', filter, pagination];
            }
            if (query) {
                return [serverId, 'genres', 'count', filter];
            }
            return [serverId, 'genres', 'count'];
        },
        list: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'genres', 'list', filter, pagination];
            }
            if (query) {
                return [serverId, 'genres', 'list', filter];
            }
            return [serverId, 'genres', 'list'];
        },
        root: (serverId) => [serverId, 'genres'],
    },
    musicFolders: {
        list: (serverId) => [serverId, 'musicFolders', 'list'],
    },
    player: {
        fetch: (meta) => {
            if (meta) {
                return ['player', 'fetch', meta];
            }
            return ['player', 'fetch'];
        },
    },
    playlists: {
        count: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'playlists', 'count', filter, pagination];
            }
            if (query) {
                return [serverId, 'playlists', 'count', filter];
            }
            return [serverId, 'playlists', 'count'];
        },
        detail: (serverId, id, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'playlists', id, 'detail', filter, pagination];
            }
            if (query) {
                return [serverId, 'playlists', id, 'detail', filter];
            }
            if (id)
                return [serverId, 'playlists', id, 'detail'];
            return [serverId, 'playlists', 'detail'];
        },
        list: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'playlists', 'list', filter, pagination];
            }
            if (query) {
                return [serverId, 'playlists', 'list', filter];
            }
            return [serverId, 'playlists', 'list'];
        },
        root: (serverId) => [serverId, 'playlists'],
        songList: (serverId, id) => {
            if (id) {
                return [serverId, 'playlists', 'songList', id];
            }
            return [serverId, 'playlists', 'songList'];
        },
    },
    radio: {
        list: (serverId) => [serverId, 'radio', 'list'],
        root: (serverId) => [serverId, 'radio'],
    },
    roles: {
        list: (serverId) => [serverId, 'roles'],
    },
    search: {
        infiniteList: (serverId, type, searchTerm) => [serverId, 'search', 'infiniteList', type, searchTerm],
        list: (serverId, query) => {
            if (query)
                return [serverId, 'search', 'list', query];
            return [serverId, 'search', 'list'];
        },
        root: (serverId) => [serverId, 'search'],
    },
    server: {
        root: (serverId) => [serverId],
    },
    songs: {
        albumRadio: (serverId, query) => {
            if (query)
                return [serverId, 'songs', 'albumRadio', query];
            return [serverId, 'songs', 'albumRadio'];
        },
        artistRadio: (serverId, query) => {
            if (query)
                return [serverId, 'songs', 'artistRadio', query];
            return [serverId, 'songs', 'artistRadio'];
        },
        count: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'songs', 'count', filter, pagination];
            }
            if (query) {
                return [serverId, 'songs', 'count', filter];
            }
            return [serverId, 'songs', 'count'];
        },
        detail: (serverId, query) => {
            if (query) {
                return [serverId, 'songs', 'detail', query];
            }
            return [serverId, 'songs', 'detail'];
        },
        infiniteList: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'songs', 'infiniteList', filter, pagination];
            }
            if (query) {
                return [serverId, 'songs', 'infiniteList', filter];
            }
            return [serverId, 'songs', 'infiniteList'];
        },
        list: (serverId, query) => {
            const { filter, pagination } = splitPaginatedQuery(query);
            if (query && pagination) {
                return [serverId, 'songs', 'list', filter, pagination];
            }
            if (query) {
                return [serverId, 'songs', 'list', filter];
            }
            return [serverId, 'songs', 'list'];
        },
        lyrics: (serverId, query) => {
            if (query)
                return [serverId, 'song', 'lyrics', 'select', query];
            return [serverId, 'song', 'lyrics'];
        },
        lyricsByRemoteId: (searchQuery) => {
            return ['song', 'lyrics', 'remote', searchQuery];
        },
        lyricsSearch: (query) => {
            if (query)
                return ['lyrics', 'search', query];
            return ['lyrics', 'search'];
        },
        randomSongList: (serverId, query) => {
            if (query)
                return [serverId, 'songs', 'randomSongList', query];
            return [serverId, 'songs', 'randomSongList'];
        },
        root: (serverId) => [serverId, 'songs'],
        similar: (serverId, query) => {
            if (query)
                return [serverId, 'song', 'similar', query];
            return [serverId, 'song', 'similar'];
        },
    },
    tags: {
        list: (serverId, type) => [serverId, 'tags', type],
    },
    users: {
        list: (serverId, query) => {
            if (query)
                return [serverId, 'users', 'list', query];
            return [serverId, 'users', 'list'];
        },
        root: (serverId) => [serverId, 'users'],
    },
};

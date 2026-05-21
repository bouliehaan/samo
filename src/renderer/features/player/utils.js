import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { folderQueries } from '/@/renderer/features/folders/api/folder-api';
import { useSettingsStore } from '/@/renderer/store';
import { LogCategory, logFn } from '/@/renderer/utils/logger';
import { logMsg } from '/@/renderer/utils/logger-message';
import { sortSongList } from '/@/shared/api/utils';
import { SongListSort, SortOrder, } from '/@/shared/types/domain-types';
export const getPlaylistSongsById = async (args) => {
    const { id, query, queryClient, serverId } = args;
    const queryFilter = {
        id,
    };
    const queryKey = queryKeys.playlists.songList(serverId, id);
    const res = await queryClient.fetchQuery({
        gcTime: 1000 * 60,
        queryFn: async ({ signal }) => api.controller.getPlaylistSongList({
            apiClientProps: {
                serverId,
                signal,
            },
            query: queryFilter,
        }),
        queryKey,
        staleTime: 1000 * 60,
    });
    if (res) {
        res.items = sortSongList(res.items, query?.sortBy || SongListSort.ID, query?.sortOrder || SortOrder.ASC);
    }
    return res;
};
export const getAlbumSongsById = async (args) => {
    const { id, query, queryClient, serverId } = args;
    const queryFilter = {
        albumIds: id,
        sortBy: SongListSort.ALBUM,
        sortOrder: SortOrder.ASC,
        startIndex: 0,
        ...query,
    };
    const queryKey = queryKeys.songs.list(serverId, queryFilter);
    const res = await queryClient.fetchQuery({
        gcTime: 1000 * 60,
        queryFn: async ({ signal }) => api.controller.getSongList({
            apiClientProps: {
                serverId,
                signal,
            },
            query: queryFilter,
        }),
        queryKey,
        staleTime: 1000 * 60,
    });
    return res;
};
export const getGenreSongsById = async (args) => {
    const { id, query, queryClient, serverId } = args;
    const data = {
        items: [],
        startIndex: 0,
        totalRecordCount: 0,
    };
    for (const genreId of id) {
        const queryFilter = {
            genreIds: [genreId],
            sortBy: SongListSort.GENRE,
            sortOrder: SortOrder.ASC,
            startIndex: 0,
            ...query,
        };
        const queryKey = queryKeys.songs.list(serverId, queryFilter);
        const res = await queryClient.fetchQuery({
            gcTime: 1000 * 60,
            queryFn: async ({ signal }) => api.controller.getSongList({
                apiClientProps: {
                    serverId,
                    signal,
                },
                query: queryFilter,
            }),
            queryKey,
            staleTime: 1000 * 60,
        });
        data.items.push(...res.items);
        if (data.totalRecordCount) {
            data.totalRecordCount += res.totalRecordCount || 0;
        }
    }
    return data;
};
export const getAlbumArtistSongsById = async (args) => {
    const { id, query, queryClient, serverId } = args;
    const queryFilter = {
        albumArtistIds: id || [],
        sortBy: SongListSort.ALBUM_ARTIST,
        sortOrder: SortOrder.ASC,
        startIndex: 0,
        ...query,
    };
    const queryKey = queryKeys.songs.list(serverId, queryFilter);
    const res = await queryClient.fetchQuery({
        gcTime: 1000 * 60,
        queryFn: async ({ signal }) => api.controller.getSongList({
            apiClientProps: {
                serverId,
                signal,
            },
            query: queryFilter,
        }),
        queryKey,
        staleTime: 1000 * 60,
    });
    return res;
};
export const getArtistSongsById = async (args) => {
    const { id, query, queryClient, serverId } = args;
    const queryFilter = {
        artistIds: id,
        sortBy: SongListSort.ALBUM,
        sortOrder: SortOrder.ASC,
        startIndex: 0,
        ...query,
    };
    const queryKey = queryKeys.songs.list(serverId, queryFilter);
    const res = await queryClient.fetchQuery({
        gcTime: 1000 * 60,
        queryFn: async ({ signal }) => api.controller.getSongList({
            apiClientProps: {
                serverId,
                signal,
            },
            query: queryFilter,
        }),
        queryKey,
        staleTime: 1000 * 60,
    });
    return res;
};
export const getSongsByQuery = async (args) => {
    const { query, queryClient, serverId } = args;
    const queryFilter = {
        sortBy: SongListSort.ALBUM,
        sortOrder: SortOrder.ASC,
        startIndex: 0,
        ...query,
    };
    const queryKey = queryKeys.songs.list(serverId, queryFilter);
    const res = await queryClient.fetchQuery({
        gcTime: 1000 * 60,
        queryFn: async ({ signal }) => {
            return api.controller.getSongList({
                apiClientProps: {
                    serverId,
                    signal,
                },
                query: queryFilter,
            });
        },
        queryKey,
        staleTime: 1000 * 60,
    });
    return res;
};
export const getSongsByFolder = async (args) => {
    const { id, queryClient, serverId } = args;
    const collectSongsFromFolder = async (folderId) => {
        const folderSongs = [];
        const folder = await queryClient.fetchQuery({
            ...folderQueries.folder({
                query: {
                    id: folderId,
                    sortBy: SongListSort.ID,
                    sortOrder: SortOrder.ASC,
                },
                serverId,
            }),
            gcTime: 0,
            staleTime: 0,
        });
        if (folder.children?.songs) {
            folderSongs.push(...folder.children.songs);
        }
        if (folder.children?.folders) {
            for (const subFolder of folder.children.folders) {
                const subFolderSongs = await collectSongsFromFolder(subFolder.id);
                folderSongs.push(...subFolderSongs);
            }
        }
        return folderSongs;
    };
    const data = {
        items: [],
        startIndex: 0,
        totalRecordCount: 0,
    };
    // Process folders sequentially to maintain order
    for (const folderId of id) {
        const folderSongs = await collectSongsFromFolder(folderId);
        data.items.push(...folderSongs);
        data.totalRecordCount = (data.totalRecordCount || 0) + folderSongs.length;
    }
    return data;
};
export const getSongById = async (args) => {
    const { id, queryClient, serverId } = args;
    const queryFilter = { id };
    const queryKey = queryKeys.songs.detail(serverId, queryFilter);
    const res = await queryClient.fetchQuery({
        gcTime: 1000 * 60,
        queryFn: async ({ signal }) => api.controller.getSongDetail({
            apiClientProps: {
                serverId,
                signal,
            },
            query: queryFilter,
        }),
        queryKey,
        staleTime: 1000 * 60,
    });
    if (!res)
        throw new Error('Song not found');
    return {
        items: [res],
        startIndex: 0,
        totalRecordCount: 1,
    };
};
const getSongFieldValue = (song, field) => {
    switch (field) {
        case 'albumArtist':
            return song.albumArtists[0]?.name || '';
        case 'artist':
            return song.artistName || song.artists[0]?.name || '';
        case 'duration':
            return song.duration;
        case 'favorite':
            return song.userFavorite;
        case 'genre':
            return song.genres[0]?.name || '';
        case 'name':
            return song.name;
        case 'note':
            return song.comment || '';
        case 'path':
            return song.path || '';
        case 'playCount':
            return song.playCount;
        case 'rating':
            return song.userRating || 0;
        case 'year':
            return song.releaseYear || 0;
        default:
            return null;
    }
};
const matchesFilter = (song, filter) => {
    const songValue = getSongFieldValue(song, filter.field);
    const filterValue = filter.value;
    // Handle null/undefined values
    if (songValue === null || songValue === undefined) {
        return false;
    }
    switch (filter.operator) {
        case 'contains':
            return String(songValue).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'endsWith':
            return String(songValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
        case 'is':
            return String(songValue).toLowerCase() === String(filterValue).toLowerCase();
        case 'isNot':
            return String(songValue).toLowerCase() !== String(filterValue).toLowerCase();
        case 'lt':
            return Number(songValue) < Number(filterValue);
        case 'notContains':
            return !String(songValue).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'regex': {
            try {
                const regex = new RegExp(String(filterValue), 'i');
                return regex.test(String(songValue));
            }
            catch {
                // Invalid regex pattern, don't match
                return false;
            }
        }
        case 'gt':
            return Number(songValue) > Number(filterValue);
        case 'startsWith':
            return String(songValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
        default:
            return true;
    }
};
export const filterSongsByPlayerFilters = (songs, filters) => {
    // Filter out invalid filters (missing field, operator, or value)
    const validFilters = filters.filter((filter) => Boolean(filter.isEnabled) &&
        filter.field &&
        filter.operator &&
        filter.value !== undefined &&
        filter.value !== null &&
        filter.value !== '');
    // If no valid filters, return all songs
    if (validFilters.length === 0) {
        return songs;
    }
    // Track filtered songs and their matching conditions
    const filteredSongs = [];
    // Filter OUT songs that match any of the filters (exclude matching songs)
    const filtered = songs.filter((song) => {
        const matchingFilter = validFilters.find((filter) => matchesFilter(song, filter));
        if (matchingFilter) {
            filteredSongs.push({ filter: matchingFilter, song });
            return false;
        }
        return true;
    });
    if (filteredSongs.length > 0) {
        logFn.debug(logMsg[LogCategory.PLAYER].playerFiltersApplied, {
            category: LogCategory.PLAYER,
            meta: {
                filteredCount: filteredSongs.length,
                filteredSongs: filteredSongs.map(({ filter, song }) => ({
                    artist: song.artistName,
                    condition: {
                        field: filter.field,
                        operator: filter.operator,
                        value: filter.value,
                    },
                    songId: song.id,
                    songName: song.name,
                })),
                originalCount: songs.length,
                remainingCount: filtered.length,
            },
        });
    }
    return filtered;
};
export const getPlayerFiltersAndFilterSongs = (songs) => {
    const state = useSettingsStore.getState();
    const filters = state.playback.filters;
    return filterSongsByPlayerFilters(songs, filters);
};

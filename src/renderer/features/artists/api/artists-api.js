import { queryOptions } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { controller } from '/@/renderer/api/controller';
import { queryKeys } from '/@/renderer/api/query-keys';
import { getOptimizedListCount } from '/@/renderer/api/utils-list-count';
import { SongListSort, SortOrder, } from '/@/shared/types/domain-types';
export const artistsQueries = {
    albumArtistDetail: (args) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getAlbumArtistDetail({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: args.query,
                });
            },
            queryKey: queryKeys.albumArtists.detail(args.serverId, args.query),
            ...args.options,
        });
    },
    albumArtistInfo: (args) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return (api.controller.getAlbumArtistInfo?.({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: args.query,
                }) ?? Promise.resolve(null));
            },
            queryKey: queryKeys.albumArtists.info(args.serverId, args.query),
            staleTime: 1000 * 60 * 60,
            ...args.options,
        });
    },
    albumArtistList: (args) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getAlbumArtistList({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: args.query,
                });
            },
            queryKey: queryKeys.albumArtists.list(args.serverId, args.query),
            ...args.options,
        });
    },
    albumArtistListCount: (args) => {
        return queryOptions({
            gcTime: 1000 * 60 * 60,
            queryFn: async ({ client, signal }) => {
                const optimizedCount = await getOptimizedListCount({
                    client,
                    listQueryFn: controller.getAlbumArtistList,
                    listQueryKeyFn: queryKeys.albumArtists.list,
                    query: args.query,
                    serverId: args.serverId,
                    signal,
                });
                if (optimizedCount !== null) {
                    return optimizedCount;
                }
                return api.controller.getAlbumArtistListCount({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: args.query,
                });
            },
            queryKey: queryKeys.albumArtists.count(args.serverId, Object.keys(args.query).length === 0 ? undefined : args.query),
            staleTime: 1000 * 60 * 60,
            ...args.options,
        });
    },
    artistList: (args) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getArtistList({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: args.query,
                });
            },
            queryKey: queryKeys.artists.list(args.serverId, args.query),
            ...args.options,
        });
    },
    artistListCount: (args) => {
        return queryOptions({
            gcTime: 1000 * 60 * 60,
            queryFn: async ({ client, signal }) => {
                const optimizedCount = await getOptimizedListCount({
                    client,
                    listQueryFn: controller.getArtistList,
                    listQueryKeyFn: queryKeys.artists.list,
                    query: args.query,
                    serverId: args.serverId,
                    signal,
                });
                if (optimizedCount !== null) {
                    return optimizedCount;
                }
                return api.controller
                    .getArtistList({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: { ...args.query, limit: 1, startIndex: 0 },
                })
                    .then((result) => result?.totalRecordCount ?? 0);
            },
            queryKey: queryKeys.artists.count(args.serverId, Object.keys(args.query).length === 0 ? undefined : args.query),
            staleTime: 1000 * 60 * 60,
            ...args.options,
        });
    },
    favoriteSongs: (args) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getSongList({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: {
                        artistIds: [args.query.artistId],
                        favorite: true,
                        limit: -1,
                        sortBy: SongListSort.RELEASE_DATE,
                        sortOrder: SortOrder.ASC,
                        startIndex: 0,
                    },
                });
            },
            queryKey: queryKeys.albumArtists.favoriteSongs(args.serverId, args.query.artistId),
        });
    },
    topSongs: (args) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getTopSongs({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: args.query,
                });
            },
            queryKey: queryKeys.albumArtists.topSongs(args.serverId, args.query),
            ...args.options,
        });
    },
};

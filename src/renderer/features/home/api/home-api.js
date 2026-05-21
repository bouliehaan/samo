import { queryOptions } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { AlbumListSort, SortOrder } from '/@/shared/types/domain-types';
export const homeQueries = {
    recentlyPlayed: (args) => {
        const requestQuery = {
            limit: 5,
            sortBy: AlbumListSort.RECENTLY_PLAYED,
            sortOrder: SortOrder.ASC,
            startIndex: 0,
            ...args.query,
        };
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getAlbumList({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: requestQuery,
                });
            },
            queryKey: queryKeys.albums.list(args.serverId, requestQuery),
            ...args.options,
        });
    },
};

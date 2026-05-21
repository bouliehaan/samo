import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { useCurrentServerId } from '/@/renderer/store';
import { GenreListSort, SortOrder, } from '/@/shared/types/domain-types';
export const genresQueries = {
    list: (args) => {
        return queryOptions({
            gcTime: 1000 * 60 * 60,
            queryFn: ({ signal }) => {
                return api.controller.getGenreList({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: args.query,
                });
            },
            queryKey: queryKeys.genres.list(args.serverId, args.query),
            staleTime: 1000 * 60 * 60,
            ...args.options,
        });
    },
    listCount: (args) => {
        return queryOptions({
            gcTime: 1000 * 60 * 60,
            queryFn: ({ signal }) => {
                return api.controller
                    .getGenreList({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: { ...args.query, limit: 1, startIndex: 0 },
                })
                    .then((result) => result?.totalRecordCount ?? 0);
            },
            queryKey: queryKeys.genres.count(args.serverId, Object.keys(args.query).length === 0 ? undefined : args.query),
            staleTime: 1000 * 60 * 60,
            ...args.options,
        });
    },
};
export const useGenreList = () => {
    const serverId = useCurrentServerId();
    return useSuspenseQuery({
        ...genresQueries.list({
            query: {
                limit: -1,
                sortBy: GenreListSort.NAME,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId,
        }),
        gcTime: Infinity,
        staleTime: Infinity,
    });
};

import { useMutation, useQuery, useQueryClient, useSuspenseQuery, } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { queryKeys } from '/@/renderer/api/query-keys';
import { useListContext } from '/@/renderer/context/list-context';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { getListRefreshMutationKey } from '/@/renderer/features/shared/components/list-refresh-button';
import { LibraryItem } from '/@/shared/types/domain-types';
const getQueryKeyName = (itemType) => {
    switch (itemType) {
        case LibraryItem.ALBUM:
            return 'albums';
        case LibraryItem.ALBUM_ARTIST:
            return 'albumArtists';
        case LibraryItem.ARTIST:
            return 'artists';
        case LibraryItem.GENRE:
            return 'genres';
        case LibraryItem.PLAYLIST:
            return 'playlists';
        case LibraryItem.SONG:
            return 'songs';
        default:
            return 'albums'; // fallback
    }
};
function getInitialData(itemCount) {
    return Array.from({ length: itemCount }, () => undefined);
}
export const useItemListPaginatedLoader = ({ currentPage, eventKey, itemsPerPage = 100, itemType, listCountQuery, listQueryFn, query = {}, serverId, }) => {
    const queryClient = useQueryClient();
    const { data: totalItemCount } = useSuspenseQuery(listCountQuery);
    const { setItemCount } = useListContext();
    useEffect(() => {
        if (totalItemCount == null || !setItemCount) {
            return;
        }
        setItemCount(totalItemCount);
    }, [setItemCount, totalItemCount]);
    const pageCount = Math.ceil(totalItemCount / itemsPerPage);
    const fetchRange = getFetchRange(currentPage, itemsPerPage);
    const startIndex = fetchRange.startIndex;
    const queryParams = useMemo(() => ({
        limit: itemsPerPage,
        startIndex: startIndex,
        ...query,
    }), [itemsPerPage, startIndex, query]);
    const { data } = useQuery({
        gcTime: 1000 * 15,
        placeholderData: { items: getInitialData(itemsPerPage) },
        queryFn: async ({ signal }) => {
            const result = await listQueryFn({
                apiClientProps: { serverId, signal },
                query: queryParams,
            });
            return result;
        },
        queryKey: queryKeys[getQueryKeyName(itemType)].list(serverId, queryParams),
        staleTime: 1000 * 15,
    });
    const refreshMutation = useMutation({
        mutationFn: async (force) => {
            const queryKey = queryKeys[getQueryKeyName(itemType)].list(serverId, queryParams);
            if (force) {
                queryClient.setQueryData(queryKey, {
                    items: getInitialData(itemsPerPage),
                });
            }
            await queryClient.invalidateQueries();
        },
        mutationKey: getListRefreshMutationKey(eventKey ?? 'paginated'),
    });
    const refreshMutationRef = useRef(refreshMutation);
    refreshMutationRef.current = refreshMutation;
    const updateItems = useCallback((indexes, value) => {
        return queryClient.setQueryData(queryKeys[getQueryKeyName(itemType)].list(serverId, queryParams), (prev) => {
            if (!prev) {
                return prev;
            }
            return {
                ...prev,
                items: prev.items.map((item, index) => {
                    if (!item) {
                        return item;
                    }
                    if (!indexes.includes(index)) {
                        return item;
                    }
                    return {
                        ...item,
                        ...value,
                    };
                }),
            };
        });
    }, [queryClient, queryParams, serverId, itemType]);
    useEffect(() => {
        const handleRefresh = (payload) => {
            if (!eventKey || eventKey !== payload.key) {
                return;
            }
            refreshMutationRef.current.mutate(true);
        };
        const handleFavorite = (payload) => {
            if (!data || !data.items) {
                return;
            }
            if (payload.itemType !== itemType || payload.serverId !== serverId) {
                return;
            }
            const idToIndexMap = data.items
                .filter(Boolean)
                .reduce((acc, item, index) => {
                acc[item.id] = index;
                return acc;
            }, {});
            const dataIndexes = payload.id
                .map((id) => idToIndexMap[id])
                .filter((idx) => idx !== undefined);
            if (dataIndexes.length === 0) {
                return;
            }
            return updateItems(dataIndexes, { userFavorite: payload.favorite });
        };
        const handleRating = (payload) => {
            if (!data || !data.items) {
                return;
            }
            if (payload.itemType !== itemType || payload.serverId !== serverId) {
                return;
            }
            const idToIndexMap = data.items.reduce((acc, item, index) => {
                acc[item.id] = index;
                return acc;
            }, {});
            const dataIndexes = payload.id
                .map((id) => idToIndexMap[id])
                .filter((idx) => idx !== undefined);
            if (dataIndexes.length === 0) {
                return;
            }
            return updateItems(dataIndexes, { userRating: payload.rating });
        };
        eventEmitter.on('ITEM_LIST_REFRESH', handleRefresh);
        eventEmitter.on('USER_FAVORITE', handleFavorite);
        eventEmitter.on('USER_RATING', handleRating);
        return () => {
            eventEmitter.off('ITEM_LIST_REFRESH', handleRefresh);
            eventEmitter.off('USER_FAVORITE', handleFavorite);
            eventEmitter.off('USER_RATING', handleRating);
        };
    }, [data, eventKey, itemType, serverId, updateItems]);
    return { data: data?.items || [], pageCount, totalItemCount };
};
const getFetchRange = (pageIndex, itemsPerPage) => {
    const startIndex = pageIndex * itemsPerPage;
    return {
        limit: itemsPerPage,
        startIndex,
    };
};

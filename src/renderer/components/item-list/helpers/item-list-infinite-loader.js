import { useMutation, useQuery, useQueryClient, useSuspenseQuery, } from '@tanstack/react-query';
import throttle from 'lodash/throttle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { queryKeys } from '/@/renderer/api/query-keys';
import { useListContext } from '/@/renderer/context/list-context';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { getListRefreshMutationKey } from '/@/renderer/features/shared/components/list-refresh-button';
import { LibraryItem } from '/@/shared/types/domain-types';
export const getListQueryKeyName = (itemType) => {
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
            return 'albums';
    }
};
function getInitialData() {
    return {
        dataMap: new Map(),
        idToIndexMap: new Map(),
        pagesLoaded: {},
        version: 0,
    };
}
export const infiniteLoaderDataQueryKey = (serverId, itemType, query) => {
    if (query) {
        return [serverId, 'item-list-infinite-loader', itemType, query];
    }
    return [serverId, 'item-list-infinite-loader', itemType];
};
export const useItemListInfiniteLoader = ({ eventKey, fetchThreshold = 0.5, itemsPerPage = 100, itemType, listCountQuery, listQueryFn, query = {}, serverId, }) => {
    const queryClient = useQueryClient();
    const lastFetchedPageRef = useRef(-1);
    const currentVisibleRangeRef = useRef(null);
    const [isRefetching, setIsRefetching] = useState(false);
    const refetchPromiseRef = useRef(null);
    const previousDataQueryKeyRef = useRef('');
    const isRefetchingRef = useRef(false);
    const { data: totalItemCount } = useSuspenseQuery(listCountQuery);
    const { setItemCount } = useListContext();
    useEffect(() => {
        if (totalItemCount == null || !setItemCount) {
            return;
        }
        setItemCount(totalItemCount);
    }, [setItemCount, totalItemCount]);
    const dataQueryKey = useMemo(() => [serverId, 'item-list-infinite-loader', itemType, query], [serverId, itemType, query]);
    const fetchPage = useCallback(async (pageNumber) => {
        const startIndex = pageNumber * itemsPerPage;
        const queryParams = {
            limit: itemsPerPage,
            startIndex,
            ...query,
        };
        const result = await queryClient.fetchQuery({
            queryFn: async ({ signal }) => {
                const result = await listQueryFn({
                    apiClientProps: { serverId, signal },
                    query: queryParams,
                });
                return result;
            },
            queryKey: queryKeys[getListQueryKeyName(itemType)].list(serverId, queryParams),
        });
        // Update the query data with the fetched page
        queryClient.setQueryData(dataQueryKey, (oldData) => {
            const nextDataMap = new Map(oldData.dataMap);
            const nextIdToIndexMap = new Map(oldData.idToIndexMap);
            result.items.forEach((item, offset) => {
                const index = startIndex + offset;
                nextDataMap.set(index, item);
                if (item && typeof item === 'object' && 'id' in item) {
                    const id = String(item.id);
                    nextIdToIndexMap.set(id, index);
                }
            });
            return {
                dataMap: nextDataMap,
                idToIndexMap: nextIdToIndexMap,
                pagesLoaded: { ...oldData.pagesLoaded, [pageNumber]: true },
                version: oldData.version + 1,
            };
        });
        // Track the last fetched page
        lastFetchedPageRef.current = Math.max(lastFetchedPageRef.current, pageNumber);
    }, [itemsPerPage, query, queryClient, serverId, dataQueryKey, listQueryFn, itemType]);
    // Reset the loaded pages and refetch current page when the query changes
    useEffect(() => {
        const currentDataQueryKey = JSON.stringify(dataQueryKey);
        if (previousDataQueryKeyRef.current === currentDataQueryKey || isRefetchingRef.current) {
            return;
        }
        previousDataQueryKeyRef.current = currentDataQueryKey;
        isRefetchingRef.current = true;
        // Capture the current visible range before resetting
        const visibleRange = currentVisibleRangeRef.current;
        // Determine which page to fetch based on current visible range
        let pageToFetch = 0;
        if (visibleRange) {
            pageToFetch = Math.floor(visibleRange.startIndex / itemsPerPage);
        }
        // Invalidate and refetch the count query to trigger Suspense
        const countQueryKey = listCountQuery.queryKey;
        // Set refetching state and create a promise to suspend
        setIsRefetching(true);
        const refetchPromise = (async () => {
            try {
                // Reset the loaded pages
                queryClient.setQueryData(dataQueryKey, (oldData) => {
                    if (!oldData)
                        return oldData;
                    return {
                        ...oldData,
                        dataMap: new Map(),
                        idToIndexMap: new Map(),
                        pagesLoaded: {},
                        version: (oldData?.version ?? 0) + 1,
                    };
                });
                lastFetchedPageRef.current = -1;
                currentVisibleRangeRef.current = null;
                // Invalidate and wait for count query to refetch
                await queryClient.ensureQueryData({
                    queryKey: countQueryKey,
                });
                // Fetch the first page after count is refetched
                await fetchPage(pageToFetch);
            }
            finally {
                setIsRefetching(false);
                isRefetchingRef.current = false;
                refetchPromiseRef.current = null;
            }
        })();
        refetchPromiseRef.current = refetchPromise;
        refetchPromise.catch(() => {
            setIsRefetching(false);
            isRefetchingRef.current = false;
            refetchPromiseRef.current = null;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataQueryKey, queryClient, fetchPage, itemsPerPage]);
    const { data } = useQuery({
        enabled: false,
        initialData: getInitialData(),
        queryFn: () => {
            return getInitialData();
        },
        queryKey: dataQueryKey,
    });
    // Suspend if refetching
    if (isRefetching && refetchPromiseRef.current) {
        throw refetchPromiseRef.current;
    }
    const onRangeChangedBase = useCallback(async (range) => {
        // Track the current visible range
        currentVisibleRangeRef.current = range;
        const pageNumber = Math.floor(range.startIndex / itemsPerPage);
        const currentData = queryClient.getQueryData(dataQueryKey);
        const startPageBoundary = pageNumber * itemsPerPage;
        const endPageBoundary = (pageNumber + 1) * itemsPerPage;
        const distanceFromStartBoundary = range.startIndex - startPageBoundary;
        const distanceToEndBoundary = endPageBoundary - range.stopIndex;
        const thresholdDistance = Math.floor(itemsPerPage * fetchThreshold);
        const isCurrentPageLoaded = currentData?.pagesLoaded[pageNumber] ?? false;
        // Fetch current page if not loaded
        if (!isCurrentPageLoaded) {
            await fetchPage(pageNumber);
        }
        // If current page is loaded, check if we should prefetch adjacent pages
        if (isCurrentPageLoaded) {
            if (distanceFromStartBoundary <= thresholdDistance &&
                pageNumber > 0 &&
                !currentData?.pagesLoaded[pageNumber - 1]) {
                await fetchPage(pageNumber - 1);
            }
            if (distanceToEndBoundary <= thresholdDistance &&
                !currentData?.pagesLoaded[pageNumber + 1]) {
                await fetchPage(pageNumber + 1);
            }
        }
    }, [itemsPerPage, fetchThreshold, queryClient, dataQueryKey, fetchPage]);
    const onRangeChanged = useMemo(() => throttle(onRangeChangedBase, 150, {
        leading: true,
        trailing: true,
    }), [onRangeChangedBase]);
    const refreshMutation = useMutation({
        mutationFn: async (force) => {
            // Invalidate all queries to ensure fresh data
            queryClient.invalidateQueries();
            // Reset the infinite list data
            const currentData = queryClient.getQueryData(dataQueryKey);
            if (force || currentData) {
                // Reset data to initial state and clear all loaded pages
                await queryClient.setQueryData(dataQueryKey, (oldData) => {
                    if (!oldData)
                        return getInitialData();
                    return {
                        ...oldData,
                        dataMap: new Map(),
                        idToIndexMap: new Map(),
                        pagesLoaded: {},
                        version: (oldData?.version ?? 0) + 1,
                    };
                });
                lastFetchedPageRef.current = -1;
            }
            // Add a delay to make the refresh visually clear
            // await new Promise((resolve) => setTimeout(resolve, 150));
            // Determine which page to refetch based on current visible range
            let pageToFetch = 0;
            if (currentVisibleRangeRef.current) {
                // Calculate the page from the current visible range
                pageToFetch = Math.floor(currentVisibleRangeRef.current.startIndex / itemsPerPage);
            }
            else if (lastFetchedPageRef.current >= 0) {
                // Fallback to last fetched page if no visible range is tracked
                pageToFetch = lastFetchedPageRef.current;
            }
            // Refetch the current page
            await fetchPage(pageToFetch);
            // Trigger range changed to ensure adjacent pages are prefetched if needed
            const startIndex = pageToFetch * itemsPerPage;
            const stopIndex = Math.min((pageToFetch + 1) * itemsPerPage, totalItemCount);
            await onRangeChangedBase({
                startIndex,
                stopIndex,
            });
        },
        mutationKey: getListRefreshMutationKey(eventKey),
    });
    const refreshMutationRef = useRef(refreshMutation);
    refreshMutationRef.current = refreshMutation;
    const refresh = useCallback(async (force) => refreshMutationRef.current.mutateAsync(force), []);
    const updateItems = useCallback((indexes, value) => {
        queryClient.setQueryData(dataQueryKey, (prev) => {
            const nextDataMap = new Map(prev.dataMap);
            indexes.forEach((index) => {
                const existing = nextDataMap.get(index);
                if (!existing || typeof existing !== 'object') {
                    return;
                }
                nextDataMap.set(index, { ...existing, ...value });
            });
            return {
                ...prev,
                dataMap: nextDataMap,
                version: prev.version + 1,
            };
        });
    }, [queryClient, dataQueryKey]);
    useEffect(() => {
        const handleRefresh = (payload) => {
            if (!eventKey || eventKey !== payload.key) {
                return;
            }
            refreshMutationRef.current.mutate(true);
        };
        eventEmitter.on('ITEM_LIST_REFRESH', handleRefresh);
        return () => {
            eventEmitter.off('ITEM_LIST_REFRESH', handleRefresh);
        };
    }, [eventKey]);
    useEffect(() => {
        const handleFavorite = (payload) => {
            if (payload.itemType !== itemType || payload.serverId !== serverId) {
                return;
            }
            const dataIndexes = payload.id
                .map((id) => data.idToIndexMap?.get(id))
                .filter((idx) => typeof idx === 'number');
            if (dataIndexes.length === 0) {
                return;
            }
            return updateItems(dataIndexes, { userFavorite: payload.favorite });
        };
        const handleRating = (payload) => {
            if (payload.itemType !== itemType || payload.serverId !== serverId) {
                return;
            }
            const dataIndexes = payload.id
                .map((id) => data.idToIndexMap?.get(id))
                .filter((idx) => typeof idx === 'number');
            if (dataIndexes.length === 0) {
                return;
            }
            return updateItems(dataIndexes, { userRating: payload.rating });
        };
        eventEmitter.on('USER_FAVORITE', handleFavorite);
        eventEmitter.on('USER_RATING', handleRating);
        return () => {
            eventEmitter.off('USER_FAVORITE', handleFavorite);
            eventEmitter.off('USER_RATING', handleRating);
        };
    }, [data, eventKey, itemType, serverId, updateItems]);
    const itemCount = totalItemCount ?? 0;
    const getItem = useCallback((index) => {
        return data.dataMap?.get(index);
    }, [data]);
    const getItemIndex = useCallback((id) => {
        return data.idToIndexMap?.get(id);
    }, [data]);
    const loadedItems = useMemo(() => {
        const map = data.dataMap;
        if (!map || map.size === 0)
            return [];
        return Array.from(map.entries())
            .sort(([a], [b]) => a - b)
            .map(([, v]) => v);
    }, [data]);
    return {
        dataVersion: data.version ?? 0,
        getItem,
        getItemIndex,
        itemCount,
        loadedItems,
        onRangeChanged,
        refresh,
        updateItems,
    };
};
export const parseListCountQuery = (query) => {
    return {
        ...query,
        limit: 1,
        startIndex: 0,
    };
};

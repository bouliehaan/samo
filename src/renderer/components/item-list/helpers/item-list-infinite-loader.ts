import {
    useMutation,
    useQuery,
    useQueryClient,
    useSuspenseQuery,
    UseSuspenseQueryOptions,
} from '@tanstack/react-query';
import throttle from 'lodash/throttle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { queryKeys } from '/@/renderer/api/query-keys';
import { watchListQueryInvalidation } from '/@/renderer/components/item-list/helpers/list-query-invalidation';
import { useListContext } from '/@/renderer/context/list-context';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { UserFavoriteEventPayload } from '/@/renderer/events/events';
import { getListRefreshMutationKey } from '/@/renderer/features/shared/components/list-refresh-button';
import { LibraryItem } from '/@/shared/types/domain-types';

export const getListQueryKeyName = (itemType: LibraryItem): string => {
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

type InfiniteLoaderCacheData = {
    dataMap: Map<number, unknown>;
    idToIndexMap: Map<string, number>;
    pagesLoaded: Record<string, boolean>;
    version: number;
};

interface UseItemListInfiniteLoaderProps {
    eventKey: string;
    fetchThreshold?: number;
    itemsPerPage: number;
    itemType: LibraryItem;
    listCountQuery: UseSuspenseQueryOptions<number, Error, number, readonly unknown[]>;
    listQueryFn: (args: { apiClientProps: any; query: any }) => Promise<{ items: unknown[] }>;
    query: Record<string, any>;
    serverId: string;
}

function getInitialData(): InfiniteLoaderCacheData {
    return {
        dataMap: new Map(),
        idToIndexMap: new Map(),
        pagesLoaded: {},
        version: 0,
    };
}

export const infiniteLoaderDataQueryKey = (
    serverId: string,
    itemType: LibraryItem,
    query?: Record<string, any>,
) => {
    if (query) {
        return [serverId, 'item-list-infinite-loader', itemType, query];
    }

    return [serverId, 'item-list-infinite-loader', itemType];
};

export const useItemListInfiniteLoader = ({
    eventKey,
    fetchThreshold = 0.5,
    itemsPerPage = 100,
    itemType,
    listCountQuery,
    listQueryFn,
    query = {},
    serverId,
}: UseItemListInfiniteLoaderProps) => {
    const queryClient = useQueryClient();
    const lastFetchedPageRef = useRef<number>(-1);
    const currentVisibleRangeRef = useRef<null | { startIndex: number; stopIndex: number }>(null);
    const [isRefetching, setIsRefetching] = useState(false);
    const refetchPromiseRef = useRef<null | Promise<void>>(null);
    const previousDataQueryKeyRef = useRef<string>('');
    const isRefetchingRef = useRef<boolean>(false);

    const { data: totalItemCount } = useSuspenseQuery<number, any, number, any>(listCountQuery);

    const { setItemCount } = useListContext();

    useEffect(() => {
        if (totalItemCount == null || !setItemCount) {
            return;
        }

        setItemCount(totalItemCount);
    }, [setItemCount, totalItemCount]);

    const dataQueryKey = useMemo(
        () => [serverId, 'item-list-infinite-loader', itemType, query],
        [serverId, itemType, query],
    );

    const fetchPage = useCallback(
        async (pageNumber: number, options?: { force?: boolean }) => {
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
                // A forced fetch is answering an invalidation, so it has to
                // reach the server even if this page was loaded moments ago.
                ...(options?.force ? { staleTime: 0 } : {}),
            });

            // Update the query data with the fetched page
            queryClient.setQueryData(dataQueryKey, (oldData: InfiniteLoaderCacheData) => {
                const nextDataMap = new Map(oldData.dataMap);
                const nextIdToIndexMap = new Map(oldData.idToIndexMap);

                result.items.forEach((item, offset) => {
                    const index = startIndex + offset;
                    nextDataMap.set(index, item);
                    if (item && typeof item === 'object' && 'id' in (item as any)) {
                        const id = String((item as any).id);
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
        },
        [itemsPerPage, query, queryClient, serverId, dataQueryKey, listQueryFn, itemType],
    );

    // The rows this list paints live in `dataQueryKey`, a cache entry written
    // only by setQueryData with no fetcher behind it. react-query has no way to
    // refresh it, so `invalidateQueries()` slides straight past — which is why
    // "sync with server", and every mutation that invalidates a list, left the
    // visible list showing exactly what it had loaded. A playlist's track count
    // never moved until the page was built again from nothing.
    //
    // So watch the page queries the rows actually came from. When one of them is
    // invalidated, refetch the pages already held and merge them in place:
    // nothing is cleared first, so rows update under the cursor with no blank
    // frame and no scroll jump.
    const listKeyPrefix = useMemo(
        () => queryKeys[getListQueryKeyName(itemType)].list(serverId) as readonly unknown[],
        [itemType, serverId],
    );

    const isRefreshingRef = useRef<boolean>(false);

    const refetchLoadedPages = useCallback(async () => {
        const current = queryClient.getQueryData<InfiniteLoaderCacheData>(dataQueryKey);
        const pages = Object.keys(current?.pagesLoaded ?? {})
            .map(Number)
            .filter((page) => Number.isInteger(page))
            .sort((a, b) => a - b);

        if (pages.length === 0) {
            const visibleRange = currentVisibleRangeRef.current;
            pages.push(visibleRange ? Math.floor(visibleRange.startIndex / itemsPerPage) : 0);
        }

        for (const page of pages) {
            await fetchPage(page, { force: true });
        }
    }, [dataQueryKey, fetchPage, itemsPerPage, queryClient]);

    const refetchLoadedPagesRef = useRef(refetchLoadedPages);
    refetchLoadedPagesRef.current = refetchLoadedPages;

    useEffect(
        () =>
            watchListQueryInvalidation(queryClient, listKeyPrefix, () => {
                // Stand down while a manual refresh or a filter change is
                // already refetching — those paths do this same work.
                if (isRefreshingRef.current || isRefetchingRef.current) {
                    return;
                }
                void refetchLoadedPagesRef.current();
            }),
        [listKeyPrefix, queryClient],
    );

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
                queryClient.setQueryData(dataQueryKey, (oldData: any) => {
                    if (!oldData) return oldData;
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
            } finally {
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

    const { data } = useQuery<InfiniteLoaderCacheData>({
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

    const onRangeChangedBase = useCallback(
        async (range: { startIndex: number; stopIndex: number }) => {
            // Track the current visible range
            currentVisibleRangeRef.current = range;

            const pageNumber = Math.floor(range.startIndex / itemsPerPage);

            const currentData = queryClient.getQueryData<{
                dataMap: Map<number, unknown>;
                pagesLoaded: Record<string, boolean>;
            }>(dataQueryKey);

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
                if (
                    distanceFromStartBoundary <= thresholdDistance &&
                    pageNumber > 0 &&
                    !currentData?.pagesLoaded[pageNumber - 1]
                ) {
                    await fetchPage(pageNumber - 1);
                }

                if (
                    distanceToEndBoundary <= thresholdDistance &&
                    !currentData?.pagesLoaded[pageNumber + 1]
                ) {
                    await fetchPage(pageNumber + 1);
                }
            }
        },
        [itemsPerPage, fetchThreshold, queryClient, dataQueryKey, fetchPage],
    );

    const onRangeChanged = useMemo(
        () =>
            throttle(onRangeChangedBase, 150, {
                leading: true,
                trailing: true,
            }),
        [onRangeChangedBase],
    );

    const refreshMutation = useMutation({
        mutationFn: async () => {
            // Guard the invalidation subscription above: it and this are the
            // same work, and running both would fetch every page twice.
            isRefreshingRef.current = true;
            try {
                // This list's queries only. It used to be a bare
                // invalidateQueries(), so pressing refresh on one grid
                // refetched every mounted query in the app.
                await queryClient.invalidateQueries({
                    exact: false,
                    queryKey: listKeyPrefix,
                });
                await queryClient.invalidateQueries({ queryKey: listCountQuery.queryKey });

                // Refetch in place rather than emptying dataMap first. Clearing
                // it blanked the whole list for as long as the round trip took,
                // and the rows that come back are the same rows.
                await refetchLoadedPages();
            } finally {
                isRefreshingRef.current = false;
            }

            // Adjacent pages, if the visible range is close enough to a boundary
            // to want them.
            const visibleRange = currentVisibleRangeRef.current;
            if (visibleRange) {
                await onRangeChangedBase(visibleRange);
            }
        },
        mutationKey: getListRefreshMutationKey(eventKey),
    });

    const refreshMutationRef = useRef(refreshMutation);
    refreshMutationRef.current = refreshMutation;

    const refresh = useCallback(async () => refreshMutationRef.current.mutateAsync(), []);

    const updateItems = useCallback(
        (indexes: number[], value: object) => {
            queryClient.setQueryData(dataQueryKey, (prev: InfiniteLoaderCacheData) => {
                const nextDataMap = new Map(prev.dataMap);

                indexes.forEach((index) => {
                    const existing = nextDataMap.get(index);
                    if (!existing || typeof existing !== 'object') {
                        return;
                    }
                    nextDataMap.set(index, { ...(existing as any), ...(value as any) });
                });

                return {
                    ...prev,
                    dataMap: nextDataMap,
                    version: prev.version + 1,
                };
            });
        },
        [queryClient, dataQueryKey],
    );

    useEffect(() => {
        const handleRefresh = (payload: { key: string }) => {
            if (!eventKey || eventKey !== payload.key) {
                return;
            }

            refreshMutationRef.current.mutate();
        };

        eventEmitter.on('ITEM_LIST_REFRESH', handleRefresh);

        return () => {
            eventEmitter.off('ITEM_LIST_REFRESH', handleRefresh);
        };
    }, [eventKey]);

    useEffect(() => {
        const handleFavorite = (payload: UserFavoriteEventPayload) => {
            if (payload.itemType !== itemType || payload.serverId !== serverId) {
                return;
            }

            const dataIndexes = payload.id
                .map((id: string) => (data as any).idToIndexMap?.get(id))
                .filter((idx): idx is number => typeof idx === 'number');

            if (dataIndexes.length === 0) {
                return;
            }

            return updateItems(dataIndexes, { userFavorite: payload.favorite });
        };

        eventEmitter.on('USER_FAVORITE', handleFavorite);

        return () => {
            eventEmitter.off('USER_FAVORITE', handleFavorite);
        };
    }, [data, eventKey, itemType, serverId, updateItems]);

    const itemCount = totalItemCount ?? 0;

    const getItem = useCallback(
        (index: number) => {
            return (data as any).dataMap?.get(index);
        },
        [data],
    );

    const getItemIndex = useCallback(
        (id: string) => {
            return (data as any).idToIndexMap?.get(id);
        },
        [data],
    );

    const loadedItems = useMemo(() => {
        const map: Map<number, unknown> | undefined = (data as any).dataMap;
        if (!map || map.size === 0) return [];
        return Array.from(map.entries())
            .sort(([a], [b]) => a - b)
            .map(([, v]) => v);
    }, [data]);

    return {
        dataVersion: (data as any).version ?? 0,
        getItem,
        getItemIndex,
        itemCount,
        loadedItems,
        onRangeChanged,
        refresh,
        updateItems,
    };
};

export const parseListCountQuery = (query: any) => {
    return {
        ...query,
        limit: 1,
        startIndex: 0,
    };
};

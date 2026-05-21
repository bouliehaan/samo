import { jsx as _jsx } from "react/jsx-runtime";
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { GridCarousel, GridCarouselSkeletonFallback, } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useCurrentServerId } from '/@/renderer/store';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
const BasePlaylistInfiniteCarousel = (props) => {
    const { containerQuery, enableRefresh, query: additionalQuery, queryKey, rowCount = 1, rows, sortBy, sortOrder, title, } = props;
    const { data: playlists, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading, refetch, } = usePlaylistListInfinite(sortBy, sortOrder, 20, additionalQuery, queryKey);
    const controls = useDefaultItemListControls();
    const cards = useMemo(() => {
        const allItems = playlists?.pages.flatMap((page) => page.items) || [];
        return allItems.map((playlist) => ({
            content: (_jsx(MemoizedItemCard, { controls: controls, data: playlist, enableDrag: true, imageFetchPriority: "low", itemType: LibraryItem.PLAYLIST, rows: rows, type: "poster", withControls: true })),
            id: playlist.id,
        }));
    }, [playlists, controls, rows]);
    const handleNextPage = useCallback(() => { }, []);
    const handlePrevPage = useCallback(() => { }, []);
    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);
    const firstPageItems = playlists?.pages[0]?.items || [];
    if (isLoading) {
        return (_jsx(GridCarouselSkeletonFallback, { containerQuery: containerQuery, placeholderItemType: LibraryItem.PLAYLIST, placeholderRows: rows, title: title }));
    }
    if (isError || firstPageItems.length === 0) {
        return null;
    }
    return (_jsx(GridCarousel, { cards: cards, containerQuery: containerQuery, enableRefresh: enableRefresh, hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage, loadNextPage: fetchNextPage, onNextPage: handleNextPage, onPrevPage: handlePrevPage, onRefresh: handleRefresh, placeholderItemType: LibraryItem.PLAYLIST, placeholderRows: rows, rowCount: rowCount, title: title }));
};
export const PlaylistInfiniteCarousel = (props) => {
    const rows = useGridRows(LibraryItem.PLAYLIST, ItemListKey.PLAYLIST);
    return _jsx(BasePlaylistInfiniteCarousel, { ...props, rows: rows });
};
function usePlaylistListInfinite(sortBy, sortOrder, itemLimit, additionalQuery, overrideQueryKey) {
    const serverId = useCurrentServerId();
    const defaultQueryKey = queryKeys.playlists.list(serverId, {
        sortBy,
        sortOrder,
        ...additionalQuery,
        startIndex: 0,
    });
    const query = useInfiniteQuery({
        enabled: Boolean(serverId),
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
            if (lastPage.items.length < itemLimit) {
                return undefined;
            }
            const nextPageParam = Number(lastPageParam) + itemLimit;
            return String(nextPageParam);
        },
        initialPageParam: '0',
        queryFn: ({ pageParam, signal }) => {
            return api.controller.getPlaylistList({
                apiClientProps: { serverId, signal },
                query: {
                    limit: itemLimit,
                    sortBy,
                    sortOrder,
                    startIndex: Number(pageParam),
                    ...additionalQuery,
                },
            });
        },
        queryKey: overrideQueryKey || defaultQueryKey,
    });
    return query;
}

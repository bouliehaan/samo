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
const BaseAlbumInfiniteCarousel = (props) => {
    const { containerQuery, enableRefresh, excludeIds, query: additionalQuery, queryKey, rowCount = 1, rows, sortBy, sortOrder, title, } = props;
    const { data: albums, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading, refetch, } = useAlbumListInfinite(sortBy, sortOrder, 20, additionalQuery, queryKey);
    const controls = useDefaultItemListControls();
    const cards = useMemo(() => {
        const allItems = albums?.pages.flatMap((page) => page.items) || [];
        const filteredItems = excludeIds
            ? allItems.filter((album) => !excludeIds.includes(album.id))
            : allItems;
        return filteredItems.map((album) => ({
            content: (_jsx(MemoizedItemCard, { controls: controls, data: album, enableDrag: true, enableExpansion: true, imageFetchPriority: "low", itemType: LibraryItem.ALBUM, rows: rows, type: "poster", withControls: true })),
            id: album.id,
        }));
    }, [albums, controls, excludeIds, rows]);
    const handleNextPage = useCallback(() => { }, []);
    const handlePrevPage = useCallback(() => { }, []);
    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);
    const firstPageItems = excludeIds
        ? albums?.pages[0]?.items.filter((album) => !excludeIds.includes(album.id)) || []
        : albums?.pages[0]?.items || [];
    if (isLoading) {
        return (_jsx(GridCarouselSkeletonFallback, { containerQuery: containerQuery, placeholderItemType: LibraryItem.ALBUM, placeholderRows: rows, title: title }));
    }
    if (isError) {
        return null;
    }
    if (firstPageItems.length === 0) {
        return null;
    }
    return (_jsx(GridCarousel, { cards: cards, containerQuery: containerQuery, enableRefresh: enableRefresh, hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage, loadNextPage: fetchNextPage, onNextPage: handleNextPage, onPrevPage: handlePrevPage, onRefresh: handleRefresh, placeholderItemType: LibraryItem.ALBUM, placeholderRows: rows, rowCount: rowCount, title: title }));
};
export const AlbumInfiniteCarousel = (props) => {
    const rows = useGridRows(LibraryItem.ALBUM, ItemListKey.ALBUM);
    return _jsx(BaseAlbumInfiniteCarousel, { ...props, rows: rows });
};
function useAlbumListInfinite(sortBy, sortOrder, itemLimit, additionalQuery, overrideQueryKey) {
    const serverId = useCurrentServerId();
    const defaultQueryKey = queryKeys.albums.infiniteList(serverId, {
        sortBy,
        sortOrder,
        ...additionalQuery,
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
            return api.controller.getAlbumList({
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

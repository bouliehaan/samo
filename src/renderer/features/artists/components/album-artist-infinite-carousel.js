import { jsx as _jsx } from "react/jsx-runtime";
import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { Suspense, useCallback, useMemo } from 'react';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { GridCarousel, GridCarouselSkeletonFallback, } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useCurrentServerId } from '/@/renderer/store';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
const BaseAlbumArtistInfiniteCarousel = (props) => {
    const { containerQuery, excludeIds, query: additionalQuery, queryKey, rowCount = 1, rows, sortBy, sortOrder, title, } = props;
    const { data: albumArtists, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, } = useAlbumArtistListInfinite(sortBy, sortOrder, 20, additionalQuery, queryKey);
    const controls = useDefaultItemListControls();
    const cards = useMemo(() => {
        // Flatten all pages and filter excluded IDs
        const allItems = albumArtists?.pages.flatMap((page) => page.items) || [];
        const filteredItems = excludeIds
            ? allItems.filter((albumArtist) => !excludeIds.includes(albumArtist.id))
            : allItems;
        return filteredItems.map((albumArtist) => ({
            content: (_jsx(MemoizedItemCard, { controls: controls, data: albumArtist, enableDrag: true, imageFetchPriority: "low", itemType: LibraryItem.ALBUM_ARTIST, rows: rows, type: "poster", withControls: true })),
            id: albumArtist.id,
        }));
    }, [albumArtists, controls, excludeIds, rows]);
    const handleNextPage = useCallback(() => { }, []);
    const handlePrevPage = useCallback(() => { }, []);
    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);
    const firstPageItems = excludeIds
        ? albumArtists?.pages[0]?.items.filter((albumArtist) => !excludeIds.includes(albumArtist.id)) || []
        : albumArtists?.pages[0]?.items || [];
    if (firstPageItems.length === 0) {
        return null;
    }
    return (_jsx(GridCarousel, { cards: cards, containerQuery: containerQuery, hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage, loadNextPage: fetchNextPage, onNextPage: handleNextPage, onPrevPage: handlePrevPage, onRefresh: handleRefresh, placeholderItemType: LibraryItem.ALBUM_ARTIST, placeholderRows: rows, rowCount: rowCount, title: title }));
};
export const AlbumArtistInfiniteCarousel = (props) => {
    const rows = useGridRows(LibraryItem.ALBUM_ARTIST, ItemListKey.ALBUM_ARTIST);
    return (_jsx(Suspense, { fallback: _jsx(GridCarouselSkeletonFallback, { containerQuery: props.containerQuery, placeholderItemType: LibraryItem.ALBUM_ARTIST, placeholderRows: rows, title: props.title }), children: _jsx(BaseAlbumArtistInfiniteCarousel, { ...props, rows: rows }) }));
};
function useAlbumArtistListInfinite(sortBy, sortOrder, itemLimit, additionalQuery, overrideQueryKey) {
    const serverId = useCurrentServerId();
    const defaultQueryKey = queryKeys.albumArtists.infiniteList(serverId, {
        sortBy,
        sortOrder,
        ...additionalQuery,
    });
    const query = useSuspenseInfiniteQuery({
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
            if (lastPage.items.length < itemLimit) {
                return undefined;
            }
            const nextPageParam = Number(lastPageParam) + itemLimit;
            return String(nextPageParam);
        },
        initialPageParam: '0',
        queryFn: ({ pageParam, signal }) => {
            return api.controller.getAlbumArtistList({
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

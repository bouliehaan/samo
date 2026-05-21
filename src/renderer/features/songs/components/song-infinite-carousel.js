import { jsx as _jsx } from "react/jsx-runtime";
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { GridCarousel, GridCarouselSkeletonFallback, } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useCurrentServerId } from '/@/renderer/store';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
const BaseSongInfiniteCarousel = (props) => {
    const { containerQuery, enableRefresh, excludeIds, query: additionalQuery, queryKey, rowCount = 1, rows, sortBy, sortOrder, title, } = props;
    const { data: songs, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading, refetch, } = useSongListInfinite(sortBy, sortOrder, 20, additionalQuery, queryKey);
    const player = usePlayer();
    const baseControls = useDefaultItemListControls();
    const controls = useMemo(() => {
        return {
            ...baseControls,
            onPlay: ({ item, playType }) => {
                if (!item) {
                    return;
                }
                player.addToQueueByData([item], playType);
            },
        };
    }, [baseControls, player]);
    const cards = useMemo(() => {
        // Flatten all pages and filter excluded IDs
        const allItems = songs?.pages.flatMap((page) => page.items) || [];
        const filteredItems = excludeIds
            ? allItems.filter((song) => !excludeIds.includes(song.id))
            : allItems;
        return filteredItems.map((song) => ({
            content: (_jsx(MemoizedItemCard, { controls: controls, data: song, enableDrag: true, imageFetchPriority: "low", itemType: LibraryItem.SONG, rows: rows, type: "poster", withControls: true })),
            id: song.id,
        }));
    }, [songs, controls, excludeIds, rows]);
    const handleNextPage = useCallback(() => { }, []);
    const handlePrevPage = useCallback(() => { }, []);
    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);
    const firstPageItems = excludeIds
        ? songs?.pages[0]?.items.filter((song) => !excludeIds.includes(song.id)) || []
        : songs?.pages[0]?.items || [];
    if (isLoading) {
        return (_jsx(GridCarouselSkeletonFallback, { containerQuery: containerQuery, placeholderItemType: LibraryItem.SONG, placeholderRows: rows, title: title }));
    }
    if (isError) {
        return null;
    }
    if (firstPageItems.length === 0) {
        return null;
    }
    return (_jsx(GridCarousel, { cards: cards, containerQuery: containerQuery, enableRefresh: enableRefresh, hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage, loadNextPage: fetchNextPage, onNextPage: handleNextPage, onPrevPage: handlePrevPage, onRefresh: handleRefresh, placeholderItemType: LibraryItem.SONG, placeholderRows: rows, rowCount: rowCount, title: title }));
};
export const SongInfiniteCarousel = (props) => {
    const rows = useGridRows(LibraryItem.SONG, ItemListKey.SONG);
    return _jsx(BaseSongInfiniteCarousel, { ...props, rows: rows });
};
function useSongListInfinite(sortBy, sortOrder, itemLimit, additionalQuery, overrideQueryKey) {
    const serverId = useCurrentServerId();
    const defaultQueryKey = queryKeys.songs.infiniteList(serverId, {
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
            return api.controller.getSongList({
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

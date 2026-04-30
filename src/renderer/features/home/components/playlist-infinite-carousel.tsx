import { QueryFunctionContext, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import {
    GridCarousel,
    GridCarouselSkeletonFallback,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { DataRow, MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useCurrentServerId } from '/@/renderer/store';
import {
    LibraryItem,
    Playlist,
    PlaylistListQuery,
    PlaylistListResponse,
    PlaylistListSort,
    SortOrder,
} from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

interface PlaylistCarouselProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    enableRefresh?: boolean;
    query?: Partial<Omit<PlaylistListQuery, 'startIndex'>>;
    queryKey?: QueryFunctionContext['queryKey'];
    rowCount?: number;
    sortBy: PlaylistListSort;
    sortOrder: SortOrder;
    title: React.ReactNode | string;
}

const BasePlaylistInfiniteCarousel = (props: PlaylistCarouselProps & { rows: DataRow[] }) => {
    const {
        containerQuery,
        enableRefresh,
        query: additionalQuery,
        queryKey,
        rowCount = 1,
        rows,
        sortBy,
        sortOrder,
        title,
    } = props;
    const {
        data: playlists,
        fetchNextPage,
        hasNextPage,
        isError,
        isFetchingNextPage,
        isLoading,
        refetch,
    } = usePlaylistListInfinite(sortBy, sortOrder, 20, additionalQuery, queryKey);

    const controls = useDefaultItemListControls();

    const cards = useMemo(() => {
        const allItems = playlists?.pages.flatMap((page: PlaylistListResponse) => page.items) || [];

        return allItems.map((playlist: Playlist) => ({
            content: (
                <MemoizedItemCard
                    controls={controls}
                    data={playlist}
                    enableDrag
                    imageFetchPriority="low"
                    itemType={LibraryItem.PLAYLIST}
                    rows={rows}
                    type="poster"
                    withControls
                />
            ),
            id: playlist.id,
        }));
    }, [playlists, controls, rows]);

    const handleNextPage = useCallback(() => {}, []);

    const handlePrevPage = useCallback(() => {}, []);

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const firstPageItems = playlists?.pages[0]?.items || [];

    if (isLoading) {
        return (
            <GridCarouselSkeletonFallback
                containerQuery={containerQuery}
                placeholderItemType={LibraryItem.PLAYLIST}
                placeholderRows={rows}
                title={title}
            />
        );
    }

    if (isError || firstPageItems.length === 0) {
        return null;
    }

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            enableRefresh={enableRefresh}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            loadNextPage={fetchNextPage}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            onRefresh={handleRefresh}
            placeholderItemType={LibraryItem.PLAYLIST}
            placeholderRows={rows}
            rowCount={rowCount}
            title={title}
        />
    );
};

export const PlaylistInfiniteCarousel = (props: PlaylistCarouselProps) => {
    const rows = useGridRows(LibraryItem.PLAYLIST, ItemListKey.PLAYLIST);

    return <BasePlaylistInfiniteCarousel {...props} rows={rows} />;
};

function usePlaylistListInfinite(
    sortBy: PlaylistListSort,
    sortOrder: SortOrder,
    itemLimit: number,
    additionalQuery?: Partial<Omit<PlaylistListQuery, 'startIndex'>>,
    overrideQueryKey?: QueryFunctionContext['queryKey'],
) {
    const serverId = useCurrentServerId();

    const defaultQueryKey = queryKeys.playlists.list(serverId, {
        sortBy,
        sortOrder,
        ...additionalQuery,
        startIndex: 0,
    });

    const query = useInfiniteQuery<PlaylistListResponse>({
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

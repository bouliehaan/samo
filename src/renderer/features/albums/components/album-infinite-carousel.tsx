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
import { DefaultItemControlProps } from '/@/renderer/components/item-list/types';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { useAlbumQualityProfiles } from '/@/renderer/hooks/use-album-quality-profiles';
import { useCurrentServerId } from '/@/renderer/store';
import { hiddenHomeItemKey } from '/@/renderer/store/hidden-home-items.store';
import {
    Album,
    AlbumListQuery,
    AlbumListResponse,
    AlbumListSort,
    LibraryItem,
    SortOrder,
} from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

interface AlbumCarouselProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    enableRefresh?: boolean;
    // Home shelves opt in so album tiles offer "Remove from home screen".
    enableRemoveFromHome?: boolean;
    excludeIds?: string[];
    query?: Partial<Omit<AlbumListQuery, 'startIndex'>>;
    queryKey?: QueryFunctionContext['queryKey'];
    rowCount?: number;
    sortBy: AlbumListSort;
    sortOrder: SortOrder;
    title: React.ReactNode | string;
}

const BaseAlbumInfiniteCarousel = (props: AlbumCarouselProps & { rows: DataRow[] }) => {
    const {
        containerQuery,
        enableRefresh,
        enableRemoveFromHome,
        excludeIds,
        query: additionalQuery,
        queryKey,
        rowCount = 1,
        rows,
        sortBy,
        sortOrder,
        title,
    } = props;
    const {
        data: albums,
        fetchNextPage,
        hasNextPage,
        isError,
        isFetchingNextPage,
        isLoading,
        refetch,
    } = useAlbumListInfinite(sortBy, sortOrder, 20, additionalQuery, queryKey);

    // Home album shelves render through the shared item-card, whose context menu
    // is driven by `controls.onMore`. Override it (stable identity so the cards
    // stay memoized) to tag the command with a `homeItemKey`, which makes the
    // album menu surface "Remove from home screen". Carousel tiles have no
    // multi-select, so a single-item menu is the correct behaviour here.
    const handleHomeMore = useCallback(({ event, item }: DefaultItemControlProps) => {
        if (!item || !event) {
            return;
        }
        const album = item as Album;
        ContextMenuController.call({
            cmd: {
                homeItemKey: hiddenHomeItemKey({
                    id: album.id,
                    serverId: album._serverId,
                    type: 'album',
                }),
                items: [album],
                type: LibraryItem.ALBUM,
            },
            event,
        });
    }, []);
    const controlsArgs = useMemo(
        () => (enableRemoveFromHome ? { overrides: { onMore: handleHomeMore } } : undefined),
        [enableRemoveFromHome, handleHomeMore],
    );
    const controls = useDefaultItemListControls(controlsArgs);

    const flattenedItems = useMemo(() => {
        const allItems = albums?.pages.flatMap((page: AlbumListResponse) => page.items) || [];
        return excludeIds ? allItems.filter((album) => !excludeIds.includes(album.id)) : allItems;
    }, [albums, excludeIds]);

    const itemsWithQuality = useAlbumQualityProfiles(flattenedItems);

    const cards = useMemo(() => {
        return itemsWithQuality.map((album: Album) => ({
            content: (
                <MemoizedItemCard
                    controls={controls}
                    data={album}
                    enableDrag
                    enableExpansion
                    imageFetchPriority="low"
                    itemType={LibraryItem.ALBUM}
                    rows={rows}
                    type="poster"
                    withControls
                />
            ),
            id: album.id,
        }));
    }, [itemsWithQuality, controls, rows]);

    const handleNextPage = useCallback(() => {}, []);

    const handlePrevPage = useCallback(() => {}, []);

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const firstPageItems = excludeIds
        ? albums?.pages[0]?.items.filter((album) => !excludeIds.includes(album.id)) || []
        : albums?.pages[0]?.items || [];

    if (isLoading) {
        return (
            <GridCarouselSkeletonFallback
                containerQuery={containerQuery}
                placeholderItemType={LibraryItem.ALBUM}
                placeholderRows={rows}
                title={title}
            />
        );
    }

    if (isError) {
        return null;
    }

    if (firstPageItems.length === 0) {
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
            placeholderItemType={LibraryItem.ALBUM}
            placeholderRows={rows}
            rowCount={rowCount}
            title={title}
        />
    );
};

export const AlbumInfiniteCarousel = (props: AlbumCarouselProps) => {
    const rows = useGridRows(LibraryItem.ALBUM, ItemListKey.ALBUM);

    return <BaseAlbumInfiniteCarousel {...props} rows={rows} />;
};

function useAlbumListInfinite(
    sortBy: AlbumListSort,
    sortOrder: SortOrder,
    itemLimit: number,
    additionalQuery?: Partial<Omit<AlbumListQuery, 'startIndex'>>,
    overrideQueryKey?: QueryFunctionContext['queryKey'],
) {
    const serverId = useCurrentServerId();

    const defaultQueryKey = queryKeys.albums.infiniteList(serverId, {
        sortBy,
        sortOrder,
        ...additionalQuery,
    });

    const query = useInfiniteQuery<AlbumListResponse>({
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

import { jsx as _jsx } from "react/jsx-runtime";
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { FeatureCarousel } from '/@/renderer/components/feature-carousel/feature-carousel';
import { useCurrentServerId } from '/@/renderer/store';
import { AlbumListSort, SortOrder } from '/@/shared/types/domain-types';
export const AlbumInfiniteFeatureCarousel = ({ itemLimit = 20, queryKey, }) => {
    const serverId = useCurrentServerId();
    const loadMoreTriggeredRef = useRef(false);
    const defaultQueryKey = queryKeys.albums.infiniteList(serverId, {
        sortBy: AlbumListSort.RANDOM,
        sortOrder: SortOrder.DESC,
    });
    const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage } = useInfiniteQuery({
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
                    sortBy: AlbumListSort.RANDOM,
                    sortOrder: SortOrder.DESC,
                    startIndex: Number(pageParam),
                },
            });
        },
        queryKey: queryKey || defaultQueryKey,
    });
    // Flatten all pages and filter for albums with images
    const albumsWithImages = useMemo(() => {
        const allAlbums = data?.pages.flatMap((page) => page.items) ?? [];
        // Filter for albums with images and remove duplicates by ID
        const uniqueAlbums = new Map();
        for (const album of allAlbums) {
            if (album.imageId && !uniqueAlbums.has(album.id)) {
                uniqueAlbums.set(album.id, album);
            }
        }
        return Array.from(uniqueAlbums.values());
    }, [data?.pages]);
    const handleNearEnd = () => {
        if (hasNextPage && !isFetchingNextPage && !loadMoreTriggeredRef.current) {
            loadMoreTriggeredRef.current = true;
            fetchNextPage().finally(() => {
                loadMoreTriggeredRef.current = false;
            });
        }
    };
    useEffect(() => {
        if (albumsWithImages.length < itemLimit * 2 &&
            hasNextPage &&
            !isFetchingNextPage &&
            !loadMoreTriggeredRef.current) {
            loadMoreTriggeredRef.current = true;
            fetchNextPage().finally(() => {
                loadMoreTriggeredRef.current = false;
            });
        }
    }, [albumsWithImages.length, hasNextPage, isFetchingNextPage, fetchNextPage, itemLimit]);
    if (isError || albumsWithImages.length === 0) {
        return null;
    }
    return _jsx(FeatureCarousel, { data: albumsWithImages, onNearEnd: handleNearEnd });
};

import { UseSuspenseQueryOptions } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { api } from '/@/renderer/api';
import { useItemListInfiniteLoader } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useItemListScrollPersist } from '/@/renderer/components/item-list/helpers/use-item-list-scroll-persist';
import { ItemGridList } from '/@/renderer/components/item-list/item-grid-list/item-grid-list';
import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { useListContext } from '/@/renderer/context/list-context';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import {
    type AlbumWithQualityProfile,
    useAlbumQualityProfiles,
} from '/@/renderer/hooks/use-album-quality-profiles';
import { useGeneralSettings } from '/@/renderer/store';
import {
    Album,
    AlbumListQuery,
    AlbumListSort,
    LibraryItem,
    SortOrder,
} from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

interface AlbumListInfiniteGridProps extends ItemListGridComponentProps<AlbumListQuery> {}

export const AlbumListInfiniteGrid = ({
    gap = 'md',
    itemsPerPage = 100,
    itemsPerRow,
    query = {
        sortBy: AlbumListSort.NAME,
        sortOrder: SortOrder.ASC,
    },
    saveScrollOffset = true,
    serverId,
    size,
}: AlbumListInfiniteGridProps) => {
    const listCountQuery = albumQueries.listCount({
        query: { ...query, limit: itemsPerPage },
        serverId: serverId,
    }) as UseSuspenseQueryOptions<number, Error, number, readonly unknown[]>;

    const listQueryFn = api.controller.getAlbumList;

    const { pageKey } = useListContext();

    const { dataVersion, getItem, getItemIndex, itemCount, loadedItems, onRangeChanged } =
        useItemListInfiniteLoader({
            eventKey: pageKey || ItemListKey.ALBUM,
            itemsPerPage,
            itemType: LibraryItem.ALBUM,
            listCountQuery,
            listQueryFn,
            query,
            serverId,
        });

    const { handleOnScrollEnd, scrollOffset } = useItemListScrollPersist({
        enabled: saveScrollOffset,
    });

    const rows = useGridRows(LibraryItem.ALBUM, ItemListKey.ALBUM, size);
    const { enableGridMultiSelect } = useGeneralSettings();

    // Match the Android library badge sweep: stamp quality profiles on whatever
    // albums have loaded so the grid can render lossless badges as the user scrolls.
    const itemsWithQuality = useAlbumQualityProfiles(loadedItems as Album[]);
    const profileById = useMemo(() => {
        const map = new Map<string, AlbumWithQualityProfile['qualityProfile']>();
        for (const album of itemsWithQuality) {
            const profile = (album as AlbumWithQualityProfile).qualityProfile;
            if (profile) map.set(`${album._serverId}:${album.id}`, profile);
        }
        return map;
    }, [itemsWithQuality]);

    const getItemWithQuality = useCallback(
        (index: number) => {
            const album = getItem(index) as Album | undefined;
            if (!album) return album;
            const profile = profileById.get(`${album._serverId}:${album.id}`);
            return profile ? ({ ...album, qualityProfile: profile } as Album) : album;
        },
        [getItem, profileById],
    );

    return (
        <ItemGridList
            data={loadedItems}
            dataVersion={dataVersion}
            enableExpansion
            enableMultiSelect={enableGridMultiSelect}
            gap={gap}
            getItem={getItemWithQuality}
            getItemIndex={getItemIndex}
            initialTop={{
                to: scrollOffset ?? 0,
                type: 'offset',
            }}
            itemCount={itemCount}
            itemsPerRow={itemsPerRow}
            itemType={LibraryItem.ALBUM}
            onRangeChanged={onRangeChanged}
            onScrollEnd={handleOnScrollEnd}
            rows={rows}
            size={size}
        />
    );
};

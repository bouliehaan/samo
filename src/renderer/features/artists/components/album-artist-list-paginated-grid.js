import { jsx as _jsx } from "react/jsx-runtime";
import { api } from '/@/renderer/api';
import { useItemListPaginatedLoader } from '/@/renderer/components/item-list/helpers/item-list-paginated-loader';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useItemListScrollPersist } from '/@/renderer/components/item-list/helpers/use-item-list-scroll-persist';
import { ItemGridList } from '/@/renderer/components/item-list/item-grid-list/item-grid-list';
import { ItemListWithPagination } from '/@/renderer/components/item-list/item-list-pagination/item-list-pagination';
import { useItemListPagination } from '/@/renderer/components/item-list/item-list-pagination/use-item-list-pagination';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { useGeneralSettings } from '/@/renderer/store';
import { AlbumArtistListSort, LibraryItem, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumArtistListPaginatedGrid = ({ gap = 'md', itemsPerPage = 100, itemsPerRow, query = {
    sortBy: AlbumArtistListSort.NAME,
    sortOrder: SortOrder.ASC,
}, saveScrollOffset = true, serverId, size, }) => {
    const { currentPage, onChange } = useItemListPagination();
    const listCountQuery = artistsQueries.albumArtistListCount({
        query: { ...query, limit: itemsPerPage },
        serverId: serverId,
    });
    const listQueryFn = api.controller.getAlbumArtistList;
    const { data, pageCount, totalItemCount } = useItemListPaginatedLoader({
        currentPage,
        eventKey: ItemListKey.ALBUM_ARTIST,
        itemsPerPage,
        itemType: LibraryItem.ALBUM_ARTIST,
        listCountQuery,
        listQueryFn,
        query,
        serverId,
    });
    const { handleOnScrollEnd, scrollOffset } = useItemListScrollPersist({
        enabled: saveScrollOffset,
    });
    const rows = useGridRows(LibraryItem.ALBUM_ARTIST, ItemListKey.ALBUM_ARTIST, size);
    const { enableGridMultiSelect } = useGeneralSettings();
    return (_jsx(ItemListWithPagination, { currentPage: currentPage, itemsPerPage: itemsPerPage, onChange: onChange, pageCount: pageCount, totalItemCount: totalItemCount, children: _jsx(ItemGridList, { currentPage: currentPage, data: data || [], enableMultiSelect: enableGridMultiSelect, gap: gap, initialTop: {
                to: scrollOffset ?? 0,
                type: 'offset',
            }, itemsPerRow: itemsPerRow, itemType: LibraryItem.ALBUM_ARTIST, onScrollEnd: handleOnScrollEnd, rows: rows, size: size }) }));
};

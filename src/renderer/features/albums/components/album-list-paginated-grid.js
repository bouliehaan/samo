import { jsx as _jsx } from "react/jsx-runtime";
import { api } from '/@/renderer/api';
import { useItemListPaginatedLoader } from '/@/renderer/components/item-list/helpers/item-list-paginated-loader';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useItemListScrollPersist } from '/@/renderer/components/item-list/helpers/use-item-list-scroll-persist';
import { ItemGridList } from '/@/renderer/components/item-list/item-grid-list/item-grid-list';
import { ItemListWithPagination } from '/@/renderer/components/item-list/item-list-pagination/item-list-pagination';
import { useItemListPagination } from '/@/renderer/components/item-list/item-list-pagination/use-item-list-pagination';
import { useListContext } from '/@/renderer/context/list-context';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { useGeneralSettings } from '/@/renderer/store';
import { AlbumListSort, LibraryItem, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumListPaginatedGrid = ({ gap = 'md', itemsPerPage = 100, itemsPerRow, query = {
    sortBy: AlbumListSort.NAME,
    sortOrder: SortOrder.ASC,
}, saveScrollOffset = true, serverId, size, }) => {
    const { pageKey } = useListContext();
    const { currentPage, onChange } = useItemListPagination();
    const listCountQuery = albumQueries.listCount({
        query: { ...query, limit: itemsPerPage },
        serverId: serverId,
    });
    const listQueryFn = api.controller.getAlbumList;
    const { data, pageCount, totalItemCount } = useItemListPaginatedLoader({
        currentPage,
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
    return (_jsx(ItemListWithPagination, { currentPage: currentPage, itemsPerPage: itemsPerPage, onChange: onChange, pageCount: pageCount, totalItemCount: totalItemCount, children: _jsx(ItemGridList, { currentPage: currentPage, data: data || [], enableExpansion: true, enableMultiSelect: enableGridMultiSelect, gap: gap, initialTop: {
                to: scrollOffset ?? 0,
                type: 'offset',
            }, itemsPerRow: itemsPerRow, itemType: LibraryItem.ALBUM, onScrollEnd: handleOnScrollEnd, rows: rows, size: size }) }));
};

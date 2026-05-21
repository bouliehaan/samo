import { jsx as _jsx } from "react/jsx-runtime";
import { api } from '/@/renderer/api';
import { useItemListPaginatedLoader } from '/@/renderer/components/item-list/helpers/item-list-paginated-loader';
import { useItemListColumnReorder } from '/@/renderer/components/item-list/helpers/use-item-list-column-reorder';
import { useItemListColumnResize } from '/@/renderer/components/item-list/helpers/use-item-list-column-resize';
import { ItemDetailList } from '/@/renderer/components/item-list/item-detail-list/item-detail-list';
import { ItemListWithPagination } from '/@/renderer/components/item-list/item-list-pagination/item-list-pagination';
import { useItemListPagination } from '/@/renderer/components/item-list/item-list-pagination/use-item-list-pagination';
import { useListContext } from '/@/renderer/context/list-context';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { AlbumListSort, LibraryItem, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumListPaginatedDetail = ({ enableHeader = true, itemsPerPage = 100, query = {
    sortBy: AlbumListSort.NAME,
    sortOrder: SortOrder.ASC,
}, serverId, }) => {
    const listCountQuery = albumQueries.listCount({
        query: { ...query },
        serverId: serverId,
    });
    const listQueryFn = api.controller.getAlbumList;
    const { pageKey } = useListContext();
    const { handleColumnReordered } = useItemListColumnReorder({
        itemListKey: ItemListKey.ALBUM,
        tableKey: 'detail',
    });
    const { handleColumnResized } = useItemListColumnResize({
        itemListKey: ItemListKey.ALBUM,
        tableKey: 'detail',
    });
    const { currentPage, onChange } = useItemListPagination();
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
    return (_jsx(ItemListWithPagination, { currentPage: currentPage, itemsPerPage: itemsPerPage, onChange: onChange, pageCount: pageCount, totalItemCount: totalItemCount, children: _jsx(ItemDetailList, { currentPage: currentPage, enableHeader: enableHeader, items: data || [], onColumnReordered: handleColumnReordered, onColumnResized: handleColumnResized }) }));
};

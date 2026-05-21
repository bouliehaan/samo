import { jsx as _jsx } from "react/jsx-runtime";
import { api } from '/@/renderer/api';
import { useItemListInfiniteLoader } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import { useItemListColumnReorder } from '/@/renderer/components/item-list/helpers/use-item-list-column-reorder';
import { useItemListColumnResize } from '/@/renderer/components/item-list/helpers/use-item-list-column-resize';
import { ItemDetailList } from '/@/renderer/components/item-list/item-detail-list/item-detail-list';
import { useListContext } from '/@/renderer/context/list-context';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { AlbumListSort, LibraryItem, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumListInfiniteDetail = ({ enableHeader = true, itemsPerPage = 100, query = {
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
    const { getItem, itemCount, loadedItems, onRangeChanged } = useItemListInfiniteLoader({
        eventKey: pageKey || ItemListKey.ALBUM,
        itemsPerPage,
        itemType: LibraryItem.ALBUM,
        listCountQuery,
        listQueryFn,
        query,
        serverId,
    });
    return (_jsx(ItemDetailList, { data: loadedItems, enableHeader: enableHeader, getItem: getItem, itemCount: itemCount, onColumnReordered: handleColumnReordered, onColumnResized: handleColumnResized, onRangeChanged: onRangeChanged }));
};

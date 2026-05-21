import { jsx as _jsx } from "react/jsx-runtime";
import { api } from '/@/renderer/api';
import { useItemListPaginatedLoader } from '/@/renderer/components/item-list/helpers/item-list-paginated-loader';
import { useItemListColumnReorder } from '/@/renderer/components/item-list/helpers/use-item-list-column-reorder';
import { useItemListColumnResize } from '/@/renderer/components/item-list/helpers/use-item-list-column-resize';
import { useItemListScrollPersist } from '/@/renderer/components/item-list/helpers/use-item-list-scroll-persist';
import { ItemListWithPagination } from '/@/renderer/components/item-list/item-list-pagination/item-list-pagination';
import { useItemListPagination } from '/@/renderer/components/item-list/item-list-pagination/use-item-list-pagination';
import { ItemTableList } from '/@/renderer/components/item-list/item-table-list/item-table-list';
import { ItemTableListColumn } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { useListContext } from '/@/renderer/context/list-context';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { usePlayerSong } from '/@/renderer/store';
import { LibraryItem, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const SongListPaginatedTable = ({ autoFitColumns = false, columns, enableAlternateRowColors = false, enableHeader = true, enableHorizontalBorders = false, enableRowHoverHighlight = true, enableSelection = true, enableVerticalBorders = false, itemsPerPage = 100, query = {
    sortBy: SongListSort.NAME,
    sortOrder: SortOrder.ASC,
}, saveScrollOffset = true, serverId, size = 'default', }) => {
    const { pageKey } = useListContext();
    const { currentPage, onChange } = useItemListPagination();
    const listCountQuery = songsQueries.listCount({
        query: { ...query, limit: itemsPerPage },
        serverId: serverId,
    });
    const listQueryFn = api.controller.getSongList;
    const { data, pageCount, totalItemCount } = useItemListPaginatedLoader({
        currentPage,
        eventKey: pageKey || ItemListKey.SONG,
        itemsPerPage,
        itemType: LibraryItem.SONG,
        listCountQuery,
        listQueryFn,
        query,
        serverId,
    });
    const { handleOnScrollEnd, scrollOffset } = useItemListScrollPersist({
        enabled: saveScrollOffset,
    });
    const { handleColumnReordered } = useItemListColumnReorder({
        itemListKey: ItemListKey.SONG,
    });
    const { handleColumnResized } = useItemListColumnResize({
        itemListKey: ItemListKey.SONG,
    });
    const startRowIndex = currentPage * itemsPerPage;
    const currentSong = usePlayerSong();
    return (_jsx(ItemListWithPagination, { currentPage: currentPage, itemsPerPage: itemsPerPage, onChange: onChange, pageCount: pageCount, totalItemCount: totalItemCount, children: _jsx(ItemTableList, { activeRowId: currentSong?.id, autoFitColumns: autoFitColumns, CellComponent: ItemTableListColumn, columns: columns, data: data || [], enableAlternateRowColors: enableAlternateRowColors, enableExpansion: false, enableHeader: enableHeader, enableHorizontalBorders: enableHorizontalBorders, enableRowHoverHighlight: enableRowHoverHighlight, enableSelection: enableSelection, enableVerticalBorders: enableVerticalBorders, initialTop: {
                to: scrollOffset ?? 0,
                type: 'offset',
            }, itemType: LibraryItem.SONG, onColumnReordered: handleColumnReordered, onColumnResized: handleColumnResized, onScrollEnd: handleOnScrollEnd, size: size, startRowIndex: startRowIndex }) }));
};

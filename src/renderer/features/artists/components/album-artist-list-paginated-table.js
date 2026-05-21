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
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { AlbumArtistListSort, LibraryItem, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumArtistListPaginatedTable = ({ autoFitColumns = false, columns, enableAlternateRowColors = false, enableHeader = true, enableHorizontalBorders = false, enableRowHoverHighlight = true, enableSelection = true, enableVerticalBorders = false, itemsPerPage = 100, query = {
    sortBy: AlbumArtistListSort.NAME,
    sortOrder: SortOrder.ASC,
}, saveScrollOffset = true, serverId, size = 'default', }) => {
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
    const { handleColumnReordered } = useItemListColumnReorder({
        itemListKey: ItemListKey.ALBUM_ARTIST,
    });
    const { handleColumnResized } = useItemListColumnResize({
        itemListKey: ItemListKey.ALBUM_ARTIST,
    });
    const startRowIndex = currentPage * itemsPerPage;
    return (_jsx(ItemListWithPagination, { currentPage: currentPage, itemsPerPage: itemsPerPage, onChange: onChange, pageCount: pageCount, totalItemCount: totalItemCount, children: _jsx(ItemTableList, { autoFitColumns: autoFitColumns, CellComponent: ItemTableListColumn, columns: columns, data: data || [], enableAlternateRowColors: enableAlternateRowColors, enableExpansion: false, enableHeader: enableHeader, enableHorizontalBorders: enableHorizontalBorders, enableRowHoverHighlight: enableRowHoverHighlight, enableSelection: enableSelection, enableVerticalBorders: enableVerticalBorders, initialTop: {
                to: scrollOffset ?? 0,
                type: 'offset',
            }, itemType: LibraryItem.ALBUM_ARTIST, onColumnReordered: handleColumnReordered, onColumnResized: handleColumnResized, onScrollEnd: handleOnScrollEnd, size: size, startRowIndex: startRowIndex }) }));
};

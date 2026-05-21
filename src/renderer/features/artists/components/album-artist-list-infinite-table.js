import { jsx as _jsx } from "react/jsx-runtime";
import { api } from '/@/renderer/api';
import { useItemListInfiniteLoader } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import { useItemListColumnReorder } from '/@/renderer/components/item-list/helpers/use-item-list-column-reorder';
import { useItemListColumnResize } from '/@/renderer/components/item-list/helpers/use-item-list-column-resize';
import { useItemListScrollPersist } from '/@/renderer/components/item-list/helpers/use-item-list-scroll-persist';
import { ItemTableList } from '/@/renderer/components/item-list/item-table-list/item-table-list';
import { ItemTableListColumn } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { AlbumArtistListSort, LibraryItem, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumArtistListInfiniteTable = ({ autoFitColumns = false, columns, enableAlternateRowColors = false, enableHeader = true, enableHorizontalBorders = false, enableRowHoverHighlight = true, enableSelection = true, enableVerticalBorders = false, itemsPerPage = 100, query = {
    sortBy: AlbumArtistListSort.NAME,
    sortOrder: SortOrder.ASC,
}, saveScrollOffset = true, serverId, size = 'default', }) => {
    const listCountQuery = artistsQueries.albumArtistListCount({
        query: { ...query, limit: itemsPerPage },
        serverId: serverId,
    });
    const listQueryFn = api.controller.getAlbumArtistList;
    const { getItem, getItemIndex, itemCount, loadedItems, onRangeChanged } = useItemListInfiniteLoader({
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
    return (_jsx(ItemTableList, { autoFitColumns: autoFitColumns, CellComponent: ItemTableListColumn, columns: columns, data: loadedItems, enableAlternateRowColors: enableAlternateRowColors, enableExpansion: false, enableHeader: enableHeader, enableHorizontalBorders: enableHorizontalBorders, enableRowHoverHighlight: enableRowHoverHighlight, enableSelection: enableSelection, enableVerticalBorders: enableVerticalBorders, getItem: getItem, getItemIndex: getItemIndex, initialTop: {
            to: scrollOffset ?? 0,
            type: 'offset',
        }, itemCount: itemCount, itemType: LibraryItem.ALBUM_ARTIST, onColumnReordered: handleColumnReordered, onColumnResized: handleColumnResized, onRangeChanged: onRangeChanged, onScrollEnd: handleOnScrollEnd, size: size }));
};

import { jsx as _jsx } from "react/jsx-runtime";
import { api } from '/@/renderer/api';
import { useItemListPaginatedLoader } from '/@/renderer/components/item-list/helpers/item-list-paginated-loader';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useItemListScrollPersist } from '/@/renderer/components/item-list/helpers/use-item-list-scroll-persist';
import { ItemGridList } from '/@/renderer/components/item-list/item-grid-list/item-grid-list';
import { ItemListWithPagination } from '/@/renderer/components/item-list/item-list-pagination/item-list-pagination';
import { useItemListPagination } from '/@/renderer/components/item-list/item-list-pagination/use-item-list-pagination';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { useGeneralSettings } from '/@/renderer/store';
import { LibraryItem, PlaylistListSort, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const PlaylistListPaginatedGrid = ({ gap = 'md', itemsPerPage = 100, itemsPerRow, query = {
    sortBy: PlaylistListSort.NAME,
    sortOrder: SortOrder.ASC,
}, saveScrollOffset = true, serverId, size, }) => {
    const listCountQuery = playlistsQueries.listCount({
        query: { ...query },
        serverId: serverId,
    });
    const listQueryFn = api.controller.getPlaylistList;
    const { currentPage, onChange } = useItemListPagination();
    const { data, pageCount, totalItemCount } = useItemListPaginatedLoader({
        currentPage,
        eventKey: ItemListKey.PLAYLIST,
        itemsPerPage,
        itemType: LibraryItem.PLAYLIST,
        listCountQuery,
        listQueryFn,
        query,
        serverId,
    });
    const { handleOnScrollEnd, scrollOffset } = useItemListScrollPersist({
        enabled: saveScrollOffset,
    });
    const rows = useGridRows(LibraryItem.PLAYLIST, ItemListKey.PLAYLIST, size);
    const { enableGridMultiSelect } = useGeneralSettings();
    return (_jsx(ItemListWithPagination, { currentPage: currentPage, itemsPerPage: itemsPerPage, onChange: onChange, pageCount: pageCount, totalItemCount: totalItemCount, children: _jsx(ItemGridList, { currentPage: currentPage, data: data || [], enableMultiSelect: enableGridMultiSelect, gap: gap, initialTop: {
                to: scrollOffset ?? 0,
                type: 'offset',
            }, itemsPerRow: itemsPerRow, itemType: LibraryItem.PLAYLIST, onScrollEnd: handleOnScrollEnd, rows: rows, size: size }) }));
};

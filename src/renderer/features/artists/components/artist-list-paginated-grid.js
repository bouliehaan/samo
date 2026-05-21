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
import { ArtistListSort, LibraryItem, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const ArtistListPaginatedGrid = ({ gap = 'md', itemsPerPage = 100, itemsPerRow, query = {
    sortBy: ArtistListSort.NAME,
    sortOrder: SortOrder.ASC,
}, saveScrollOffset = true, serverId, size, }) => {
    const { currentPage, onChange } = useItemListPagination();
    const listCountQuery = artistsQueries.artistListCount({
        query: { ...query, limit: itemsPerPage },
        serverId: serverId,
    });
    const listQueryFn = api.controller.getArtistList;
    const { data, pageCount, totalItemCount } = useItemListPaginatedLoader({
        currentPage,
        eventKey: ItemListKey.ARTIST,
        itemsPerPage,
        itemType: LibraryItem.ARTIST,
        listCountQuery,
        listQueryFn,
        query,
        serverId,
    });
    const { handleOnScrollEnd, scrollOffset } = useItemListScrollPersist({
        enabled: saveScrollOffset,
    });
    const rows = useGridRows(LibraryItem.ARTIST, ItemListKey.ARTIST, size);
    const { enableGridMultiSelect } = useGeneralSettings();
    return (_jsx(ItemListWithPagination, { currentPage: currentPage, itemsPerPage: itemsPerPage, onChange: onChange, pageCount: pageCount, totalItemCount: totalItemCount, children: _jsx(ItemGridList, { currentPage: currentPage, data: data || [], enableMultiSelect: enableGridMultiSelect, gap: gap, initialTop: {
                to: scrollOffset ?? 0,
                type: 'offset',
            }, itemsPerRow: itemsPerRow, itemType: LibraryItem.ARTIST, onScrollEnd: handleOnScrollEnd, rows: rows, size: size }) }));
};

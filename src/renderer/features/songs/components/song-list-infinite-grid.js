import { jsx as _jsx } from "react/jsx-runtime";
import { api } from '/@/renderer/api';
import { useItemListInfiniteLoader } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useItemListScrollPersist } from '/@/renderer/components/item-list/helpers/use-item-list-scroll-persist';
import { ItemGridList } from '/@/renderer/components/item-list/item-grid-list/item-grid-list';
import { useListContext } from '/@/renderer/context/list-context';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { useGeneralSettings } from '/@/renderer/store';
import { LibraryItem, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const SongListInfiniteGrid = ({ gap = 'md', itemsPerPage = 100, itemsPerRow, query = {
    sortBy: SongListSort.NAME,
    sortOrder: SortOrder.ASC,
}, saveScrollOffset = true, serverId, size, }) => {
    const listCountQuery = songsQueries.listCount({
        query: { ...query, limit: itemsPerPage },
        serverId: serverId,
    });
    const listQueryFn = api.controller.getSongList;
    const { pageKey } = useListContext();
    const { dataVersion, getItem, getItemIndex, itemCount, loadedItems, onRangeChanged } = useItemListInfiniteLoader({
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
    const rows = useGridRows(LibraryItem.SONG, ItemListKey.SONG, size);
    const { enableGridMultiSelect } = useGeneralSettings();
    return (_jsx(ItemGridList, { data: loadedItems, dataVersion: dataVersion, enableMultiSelect: enableGridMultiSelect, gap: gap, getItem: getItem, getItemIndex: getItemIndex, initialTop: {
            to: scrollOffset ?? 0,
            type: 'offset',
        }, itemCount: itemCount, itemsPerRow: itemsPerRow, itemType: LibraryItem.SONG, onRangeChanged: onRangeChanged, onScrollEnd: handleOnScrollEnd, rows: rows, size: size }));
};

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ALBUM_ARTIST_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { Divider } from '/@/shared/components/divider/divider';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { AlbumArtistListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumArtistListHeaderFilters = () => {
    return (_jsxs(Flex, { justify: "space-between", children: [_jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(ListSortByDropdown, { defaultSortByValue: AlbumArtistListSort.NAME, itemType: LibraryItem.ALBUM_ARTIST, listKey: ItemListKey.ALBUM_ARTIST }), _jsx(Divider, { orientation: "vertical" }), _jsx(ListSortOrderToggleButton, { defaultSortOrder: SortOrder.ASC, listKey: ItemListKey.ALBUM_ARTIST }), _jsx(ListRefreshButton, { listKey: ItemListKey.ALBUM_ARTIST })] }), _jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(ListDisplayTypeToggleButton, { listKey: ItemListKey.ALBUM_ARTIST }), _jsx(ListConfigMenu, { listKey: ItemListKey.ALBUM_ARTIST, tableColumnsData: ALBUM_ARTIST_TABLE_COLUMNS })] })] }));
};

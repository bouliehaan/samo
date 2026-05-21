import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { GENRE_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { Divider } from '/@/shared/components/divider/divider';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { GenreListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const GenreListHeaderFilters = () => {
    return (_jsxs(Flex, { justify: "space-between", children: [_jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(ListSortByDropdown, { defaultSortByValue: GenreListSort.NAME, itemType: LibraryItem.GENRE, listKey: ItemListKey.GENRE }), _jsx(Divider, { orientation: "vertical" }), _jsx(ListSortOrderToggleButton, { defaultSortOrder: SortOrder.ASC, listKey: ItemListKey.GENRE }), _jsx(ListRefreshButton, { listKey: ItemListKey.GENRE })] }), _jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(ListDisplayTypeToggleButton, { listKey: ItemListKey.GENRE }), _jsx(ListConfigMenu, { listKey: ItemListKey.GENRE, tableColumnsData: GENRE_TABLE_COLUMNS })] })] }));
};

import { GENRE_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { GenreListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

export const GenreListHeaderFilters = () => {
    return (
        <Flex align="center" gap="sm" justify="space-between" wrap="wrap">
            <Group gap="xs" style={{ flex: '1 1 auto', minWidth: 0 }}>
                <ListSortByDropdown
                    defaultSortByValue={GenreListSort.NAME}
                    itemType={LibraryItem.GENRE}
                    listKey={ItemListKey.GENRE}
                />

                <ListSortOrderToggleButton
                    defaultSortOrder={SortOrder.ASC}
                    listKey={ItemListKey.GENRE}
                />
                <ListRefreshButton listKey={ItemListKey.GENRE} />
            </Group>
            <Group gap="xs" wrap="wrap">
                <ListDisplayTypeToggleButton listKey={ItemListKey.GENRE} />
                <ListConfigMenu
                    listKey={ItemListKey.GENRE}
                    tableColumnsData={GENRE_TABLE_COLUMNS}
                />
            </Group>
        </Flex>
    );
};

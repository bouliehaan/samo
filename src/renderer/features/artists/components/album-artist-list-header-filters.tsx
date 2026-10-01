import { ALBUM_ARTIST_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { AlbumArtistListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

export const AlbumArtistListHeaderFilters = () => {
    return (
        <Flex align="center" gap="sm" justify="space-between" wrap="wrap">
            <Group gap="xs" style={{ flex: '1 1 auto', minWidth: 0 }}>
                <ListSortByDropdown
                    defaultSortByValue={AlbumArtistListSort.NAME}
                    itemType={LibraryItem.ALBUM_ARTIST}
                    listKey={ItemListKey.ALBUM_ARTIST}
                />

                <ListSortOrderToggleButton
                    defaultSortOrder={SortOrder.ASC}
                    listKey={ItemListKey.ALBUM_ARTIST}
                />
                <ListRefreshButton listKey={ItemListKey.ALBUM_ARTIST} />
            </Group>
            <Group gap="xs" wrap="wrap">
                <ListDisplayTypeToggleButton listKey={ItemListKey.ALBUM_ARTIST} />
                <ListConfigMenu
                    listKey={ItemListKey.ALBUM_ARTIST}
                    tableColumnsData={ALBUM_ARTIST_TABLE_COLUMNS}
                />
            </Group>
        </Flex>
    );
};

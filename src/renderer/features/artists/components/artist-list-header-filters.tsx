import { useQuery } from '@tanstack/react-query';

import { ALBUM_ARTIST_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSelectFilter } from '/@/renderer/features/shared/components/list-select-filter';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { FILTER_KEYS } from '/@/renderer/features/shared/utils';
import { useCurrentServer } from '/@/renderer/store';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { ArtistListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

export const ArtistListHeaderFilters = () => {
    const server = useCurrentServer();

    const rolesQuery = useQuery(sharedQueries.roles({ query: {}, serverId: server.id }));

    return (
        <Flex align="center" gap="sm" justify="space-between" wrap="wrap">
            <Group gap="xs" style={{ flex: '1 1 auto', minWidth: 0 }}>
                <ListSortByDropdown
                    defaultSortByValue={ArtistListSort.NAME}
                    itemType={LibraryItem.ARTIST}
                    listKey={ItemListKey.ARTIST}
                />

                <ListSortOrderToggleButton
                    defaultSortOrder={SortOrder.ASC}
                    listKey={ItemListKey.ARTIST}
                />
                {rolesQuery.data && rolesQuery.data.length > 0 && (
                    <ListSelectFilter
                        data={rolesQuery.data}
                        filterKey={FILTER_KEYS.ARTIST.ROLE}
                        listKey={ItemListKey.ARTIST}
                    />
                )}
                <ListRefreshButton listKey={ItemListKey.ARTIST} />
            </Group>
            <Group gap="xs" wrap="wrap">
                <ListDisplayTypeToggleButton listKey={ItemListKey.ARTIST} />
                <ListConfigMenu
                    listKey={ItemListKey.ARTIST}
                    tableColumnsData={ALBUM_ARTIST_TABLE_COLUMNS}
                />
            </Group>
        </Flex>
    );
};

import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import {
    CLIENT_SIDE_SONG_FILTERS,
    ListSortByDropdownControlled,
} from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButtonControlled } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { useAppStore } from '/@/renderer/store/app.store';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { LibraryItem, SongListSort, SortOrder } from '/@/shared/types/domain-types';

export const AlbumArtistDetailFavoriteSongsListHeaderFilters = () => {
    const albumArtistDetailFavoriteSongsSort = useAppStore(
        (state) => state.albumArtistDetailFavoriteSongsSort,
    );
    const setAlbumArtistDetailFavoriteSongsSort = useAppStore(
        (state) => state.actions.setAlbumArtistDetailFavoriteSongsSort,
    );
    const sortBy = albumArtistDetailFavoriteSongsSort.sortBy;
    const sortOrder = albumArtistDetailFavoriteSongsSort.sortOrder;

    return (
        <Flex align="center" gap="sm" justify="space-between" wrap="wrap">
            <Group gap="xs" style={{ flex: '1 1 auto', minWidth: 0 }}>
                <ListSortByDropdownControlled
                    filters={CLIENT_SIDE_SONG_FILTERS}
                    itemType={LibraryItem.SONG}
                    setSortBy={(value) =>
                        setAlbumArtistDetailFavoriteSongsSort(value as SongListSort, sortOrder)
                    }
                    sortBy={sortBy}
                />

                <ListSortOrderToggleButtonControlled
                    setSortOrder={(value) =>
                        setAlbumArtistDetailFavoriteSongsSort(sortBy, value as SortOrder)
                    }
                    sortOrder={sortOrder}
                />

                <ListSearchInput />
            </Group>
        </Flex>
    );
};

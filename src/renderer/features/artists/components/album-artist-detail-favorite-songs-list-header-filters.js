import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { CLIENT_SIDE_SONG_FILTERS, ListSortByDropdownControlled, } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButtonControlled } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { useAppStore } from '/@/renderer/store/app.store';
import { Divider } from '/@/shared/components/divider/divider';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { LibraryItem } from '/@/shared/types/domain-types';
export const AlbumArtistDetailFavoriteSongsListHeaderFilters = () => {
    const albumArtistDetailFavoriteSongsSort = useAppStore((state) => state.albumArtistDetailFavoriteSongsSort);
    const setAlbumArtistDetailFavoriteSongsSort = useAppStore((state) => state.actions.setAlbumArtistDetailFavoriteSongsSort);
    const sortBy = albumArtistDetailFavoriteSongsSort.sortBy;
    const sortOrder = albumArtistDetailFavoriteSongsSort.sortOrder;
    return (_jsx(Flex, { justify: "space-between", children: _jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(ListSortByDropdownControlled, { filters: CLIENT_SIDE_SONG_FILTERS, itemType: LibraryItem.SONG, setSortBy: (value) => setAlbumArtistDetailFavoriteSongsSort(value, sortOrder), sortBy: sortBy }), _jsx(Divider, { orientation: "vertical" }), _jsx(ListSortOrderToggleButtonControlled, { setSortOrder: (value) => setAlbumArtistDetailFavoriteSongsSort(sortBy, value), sortOrder: sortOrder }), _jsx(Divider, { orientation: "vertical" }), _jsx(ListSearchInput, {})] }) }));
};

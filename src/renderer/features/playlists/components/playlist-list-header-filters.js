import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { PLAYLIST_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { openCreatePlaylistModal } from '/@/renderer/features/playlists/components/create-playlist-form';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { useCurrentServer } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { LibraryItem, PlaylistListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const PlaylistListHeaderFilters = () => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const handleCreatePlaylistModal = (e) => {
        openCreatePlaylistModal(server, e);
    };
    return (_jsxs(Flex, { justify: "space-between", children: [_jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(ListSortByDropdown, { defaultSortByValue: PlaylistListSort.NAME, itemType: LibraryItem.PLAYLIST, listKey: ItemListKey.PLAYLIST }), _jsx(Divider, { orientation: "vertical" }), _jsx(ListSortOrderToggleButton, { defaultSortOrder: SortOrder.ASC, listKey: ItemListKey.PLAYLIST }), _jsx(ListRefreshButton, { listKey: ItemListKey.PLAYLIST })] }), _jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(Button, { onClick: handleCreatePlaylistModal, variant: "subtle", children: t('action.createPlaylist', { postProcess: 'sentenceCase' }) }), _jsx(ListDisplayTypeToggleButton, { listKey: ItemListKey.PLAYLIST }), _jsx(ListConfigMenu, { listKey: ItemListKey.PLAYLIST, tableColumnsData: PLAYLIST_TABLE_COLUMNS })] })] }));
};

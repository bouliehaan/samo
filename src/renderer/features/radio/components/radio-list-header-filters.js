import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { openCreateRadioStationModal } from '/@/renderer/features/radio/components/create-radio-station-form';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { useCurrentServer, usePermissions } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { LibraryItem, RadioListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const RadioListHeaderFilters = () => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const permissions = usePermissions();
    const handleCreateRadioStationModal = (e) => {
        openCreateRadioStationModal(server, e);
    };
    return (_jsxs(Flex, { justify: "space-between", children: [_jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(ListSortByDropdown, { defaultSortByValue: RadioListSort.NAME, itemType: LibraryItem.RADIO_STATION, listKey: ItemListKey.RADIO }), _jsx(Divider, { orientation: "vertical" }), _jsx(ListSortOrderToggleButton, { defaultSortOrder: SortOrder.ASC, listKey: ItemListKey.RADIO })] }), permissions.radio.create && (_jsx(Group, { gap: "sm", wrap: "nowrap", children: _jsx(Button, { onClick: handleCreateRadioStationModal, variant: "subtle", children: t('action.createRadioStation', { postProcess: 'sentenceCase' }) }) }))] }));
};

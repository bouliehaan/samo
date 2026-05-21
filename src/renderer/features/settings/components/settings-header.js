import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useTranslation } from 'react-i18next';
import { useSettingSearchContext } from '/@/renderer/features/settings/context/search-context';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { SearchInput } from '/@/renderer/features/shared/components/search-input';
import { useSettingsStoreActions } from '/@/renderer/store/settings.store';
import { Button } from '/@/shared/components/button/button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { Text } from '/@/shared/components/text/text';
export const SettingsHeader = ({ setSearch }) => {
    const { t } = useTranslation();
    const { reset } = useSettingsStoreActions();
    const search = useSettingSearchContext();
    const handleResetToDefault = () => {
        reset();
        closeAllModals();
    };
    const openResetConfirmModal = () => {
        openModal({
            children: (_jsx(ConfirmModal, { onConfirm: handleResetToDefault, children: _jsx(Text, { children: t('common.areYouSure', { postProcess: 'sentenceCase' }) }) })),
            title: t('common.resetToDefault', { postProcess: 'sentenceCase' }),
        });
    };
    return (_jsx(Flex, { children: _jsx(LibraryHeaderBar, { children: _jsxs(Flex, { align: "center", justify: "space-between", w: "100%", children: [_jsxs(Group, { wrap: "nowrap", children: [_jsx(Icon, { icon: "settings", size: "5xl" }), _jsx(LibraryHeaderBar.Title, { children: t('common.setting', { count: 2, postProcess: 'titleCase' }) })] }), _jsxs(Group, { children: [_jsx(SearchInput, { defaultValue: search, onChange: (event) => setSearch(event.target.value.toLocaleLowerCase()) }), _jsx(Button, { onClick: openResetConfirmModal, variant: "default", children: t('common.resetToDefault', { postProcess: 'sentenceCase' }) })] })] }) }) }));
};

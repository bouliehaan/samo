import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { SettingsContent } from '/@/renderer/features/settings/components/settings-content';
import { SettingsHeader } from '/@/renderer/features/settings/components/settings-header';
import { SettingSearchContext } from '/@/renderer/features/settings/context/search-context';
export const SettingsContextModal = () => {
    const [search, setSearch] = useState('');
    return (_jsxs(SettingSearchContext.Provider, { value: search, children: [_jsx(SettingsHeader, { setSearch: setSearch }), _jsx(SettingsContent, {})] }));
};

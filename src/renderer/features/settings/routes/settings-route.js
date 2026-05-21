import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useState } from 'react';
import { SettingsContent } from '/@/renderer/features/settings/components/settings-content';
import { SettingSearchContext } from '/@/renderer/features/settings/context/search-context';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { Flex } from '/@/shared/components/flex/flex';
const SettingsHeader = lazy(() => import('/@/renderer/features/settings/components/settings-header').then((module) => ({
    default: module.SettingsHeader,
})));
const SettingsRoute = () => {
    const [search, setSearch] = useState('');
    return (_jsx(AnimatedPage, { children: _jsx(SettingSearchContext.Provider, { value: search, children: _jsx(LibraryContainer, { children: _jsxs(Flex, { direction: "column", h: "100%", w: "100%", children: [_jsx(Suspense, { fallback: _jsx(_Fragment, {}), children: _jsx(SettingsHeader, { setSearch: setSearch }) }), _jsx(SettingsContent, {})] }) }) }) }));
};
export default SettingsRoute;

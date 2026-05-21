import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { ExportImportSettings } from '/@/renderer/features/settings/components/advanced/export-import-settings';
import { CacheSettings } from '/@/renderer/features/settings/components/window/cache-settngs';
import { Divider } from '/@/shared/components/divider/divider';
import { Stack } from '/@/shared/components/stack/stack';
const sections = [
    { component: ExportImportSettings, key: 'export-import' },
    { component: CacheSettings, key: 'cache' },
];
export const AdvancedTab = memo(() => {
    return (_jsx(Stack, { gap: "md", children: sections.map(({ component: Section, key }, index) => (_jsxs(Fragment, { children: [_jsx(Section, {}), index < sections.length - 1 && _jsx(Divider, {})] }, key))) }));
});

import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { ApplicationSettings } from '/@/renderer/features/settings/components/general/application-settings';
import { Stack } from '/@/shared/components/stack/stack';
export const GeneralTab = memo(() => {
    return (_jsx(Stack, { gap: "md", children: _jsx(ApplicationSettings, {}) }));
});

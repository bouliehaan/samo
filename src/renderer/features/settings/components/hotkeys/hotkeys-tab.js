import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { memo } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { HotkeyManagerSettings } from '/@/renderer/features/settings/components/hotkeys/hotkey-manager-settings';
import { MediaSessionSettings } from '/@/renderer/features/settings/components/hotkeys/media-session-settings';
import { WindowHotkeySettings } from '/@/renderer/features/settings/components/hotkeys/window-hotkey-settings';
import { Divider } from '/@/shared/components/divider/divider';
import { Stack } from '/@/shared/components/stack/stack';
const sections = [
    { component: WindowHotkeySettings, hidden: !isElectron(), key: 'window' },
    { component: MediaSessionSettings, key: 'media-session' },
    { component: HotkeyManagerSettings, key: 'hotkey-manager' },
];
export const HotkeysTab = memo(() => {
    return (_jsx(Stack, { gap: "md", children: sections.map(({ component: Section, hidden, key }, index) => (_jsxs(Fragment, { children: [!hidden && _jsx(Section, {}), index < sections.length - 1 && _jsx(Divider, {})] }, key))) }));
});

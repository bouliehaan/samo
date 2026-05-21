import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { memo } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { DiscordSettings } from '/@/renderer/features/settings/components/window/discord-settings';
import { PasswordSettings } from '/@/renderer/features/settings/components/window/password-settings';
import { RemoteSettings } from '/@/renderer/features/settings/components/window/remote-settings';
import { WindowSettings } from '/@/renderer/features/settings/components/window/window-settings';
import { Divider } from '/@/shared/components/divider/divider';
import { Stack } from '/@/shared/components/stack/stack';
const utils = isElectron() ? window.api.utils : null;
const sections = [
    { component: WindowSettings, key: 'window' },
    { component: DiscordSettings, key: 'discord' },
    { component: RemoteSettings, key: 'remote' },
    { component: PasswordSettings, hidden: !utils?.isLinux(), key: 'password' },
];
export const WindowTab = memo(() => {
    return (_jsx(Stack, { gap: "md", children: sections.map(({ component: Section, hidden, key }, index) => (_jsxs(Fragment, { children: [!hidden && _jsx(Section, {}), index < sections.length - 1 && _jsx(Divider, {})] }, key))) }));
});

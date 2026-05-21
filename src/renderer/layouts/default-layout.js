import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import clsx from 'clsx';
import isElectron from 'is-electron';
import styles from './default-layout.module.css';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { MainContent } from '/@/renderer/layouts/default-layout/main-content';
import { PlayerBar } from '/@/renderer/layouts/default-layout/player-bar';
import { WindowBar } from '/@/renderer/layouts/window-bar';
import { useSettingsStore, useWindowBarStyle } from '/@/renderer/store/settings.store';
import { Platform, PlayerType } from '/@/shared/types/types';
if (!isElectron()) {
    useSettingsStore.getState().actions.setSettings({
        playback: {
            type: PlayerType.WEB,
        },
    });
}
export const DefaultLayout = ({ shell }) => {
    const windowBarStyle = useWindowBarStyle();
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: clsx(styles.layout, {
                    [styles.macos]: windowBarStyle === Platform.MACOS,
                    [styles.windows]: windowBarStyle === Platform.WINDOWS,
                }), id: "default-layout", children: [_jsx(WindowBar, {}), _jsx(MainContent, { shell: shell }), _jsx(PlayerBar, {})] }), _jsx(ContextMenuController.Root, {})] }));
};

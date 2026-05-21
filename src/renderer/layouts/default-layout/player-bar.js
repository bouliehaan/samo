import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './player-bar.module.css';
import { Playerbar } from '/@/renderer/features/player/components/playerbar';
import { usePlayerbarOpenDrawer } from '/@/renderer/store';
export const PlayerBar = () => {
    const playerbarOpenDrawer = usePlayerbarOpenDrawer();
    return (_jsx("div", { className: clsx({
            [styles.container]: true,
            [styles.openDrawer]: playerbarOpenDrawer,
        }), id: "player-bar", children: _jsx(Playerbar, {}) }));
};

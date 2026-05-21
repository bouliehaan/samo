import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { lazy, Suspense } from 'react';
import styles from './playerbar.module.css';
import { CenterControls } from '/@/renderer/features/player/components/center-controls';
import { LeftControls } from '/@/renderer/features/player/components/left-controls';
import { RightControls } from '/@/renderer/features/player/components/right-controls';
import { useIsMobile } from '/@/renderer/hooks/use-is-mobile';
import { Spinner } from '/@/shared/components/spinner/spinner';
const MobilePlayerbar = lazy(() => import('./mobile-playerbar').then((module) => ({
    default: module.MobilePlayerbar,
})));
import { useFullScreenPlayerStore, useSetFullScreenPlayerStore } from '/@/renderer/store';
import { usePlayerbarOpenDrawer } from '/@/renderer/store';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';
export const Playerbar = () => {
    const playerbarOpenDrawer = usePlayerbarOpenDrawer();
    const { expanded: isFullScreenPlayerExpanded } = useFullScreenPlayerStore();
    const setFullScreenPlayerStore = useSetFullScreenPlayerStore();
    const isMobile = useIsMobile();
    const handleToggleFullScreenPlayer = (e) => {
        e?.stopPropagation();
        setFullScreenPlayerStore({ expanded: !isFullScreenPlayerExpanded });
    };
    if (isMobile) {
        return (_jsx(Suspense, { fallback: _jsx(Spinner, {}), children: _jsx(MobilePlayerbar, {}) }));
    }
    return (_jsx("div", { className: clsx(styles.container, PlaybackSelectors.mediaPlayer), onClick: playerbarOpenDrawer ? handleToggleFullScreenPlayer : undefined, children: _jsxs("div", { className: styles.controlsGrid, children: [_jsx("div", { className: styles.leftGridItem, children: _jsx(LeftControls, {}) }), _jsx("div", { className: styles.centerGridItem, children: _jsx(CenterControls, {}) }), _jsx("div", { className: styles.rightGridItem, children: _jsx(RightControls, {}) })] }) }));
};

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import clsx from 'clsx';
import { AnimatePresence } from 'motion/react';
import { Suspense } from 'react';
import { Outlet } from 'react-router';
import styles from './mobile-layout.module.css';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { FullScreenVisualizer } from '/@/renderer/features/player/components/full-screen-visualizer';
import { MobileFullscreenPlayer } from '/@/renderer/features/player/components/mobile-fullscreen-player';
import { MobileSidebar } from '/@/renderer/features/sidebar/components/mobile-sidebar';
import { PlayerBar } from '/@/renderer/layouts/default-layout/player-bar';
import { WindowBar } from '/@/renderer/layouts/window-bar';
import { useFullScreenPlayerOverlayState, useWindowBarStyle } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Drawer } from '/@/shared/components/drawer/drawer';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { Platform } from '/@/shared/types/types';
export const MobileLayout = ({ shell }) => {
    const [sidebarOpened, { close: closeSidebar, open: openSidebar }] = useDisclosure(false);
    const { expanded: isFullScreenPlayerExpanded, visualizerExpanded: isFullScreenVisualizerExpanded, } = useFullScreenPlayerOverlayState();
    const windowBarStyle = useWindowBarStyle();
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: clsx(styles.layout, {
                    [styles.macos]: windowBarStyle === Platform.MACOS,
                    [styles.windows]: windowBarStyle === Platform.WINDOWS,
                }), id: "mobile-layout", children: [!shell && _jsx(WindowBar, {}), _jsx(ActionIcon, { className: styles.drawerButton, icon: "menu", onClick: openSidebar, size: "lg", tooltip: { label: 'Menu' }, variant: "subtle" }), _jsx("main", { className: styles.mainContent, children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(Outlet, {}) }) }), _jsx(PlayerBar, {})] }), _jsx(Drawer, { onClose: closeSidebar, opened: sidebarOpened, position: "left", size: "320px", styles: {
                    body: {
                        height: '100%',
                        padding: 0,
                    },
                    content: {
                        height: '100%',
                        width: '100%',
                    },
                }, withCloseButton: false, children: _jsx(MobileSidebar, {}) }), _jsx(AnimatePresence, { initial: false, children: isFullScreenPlayerExpanded && (_jsx("div", { className: styles.fullScreenPlayerOverlay, children: _jsx(MobileFullscreenPlayer, {}) })) }), _jsx(AnimatePresence, { initial: false, children: isFullScreenVisualizerExpanded && (_jsx("div", { className: styles.fullScreenPlayerOverlay, children: _jsx(FullScreenVisualizer, {}) })) }), _jsx(ContextMenuController.Root, {})] }));
};

import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'motion/react';
import { useCallback } from 'react';
import { useLocation } from 'react-router';
import styles from './side-drawer-queue.module.css';
import { DrawerPlayQueue } from '/@/renderer/features/now-playing/components/drawer-play-queue';
import { AppRoute } from '/@/renderer/router/routes';
import { useAppStore } from '/@/renderer/store';
import { Icon } from '/@/shared/components/icon/icon';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { useTimeout } from '/@/shared/hooks/use-timeout';
import { Platform } from '/@/shared/types/types';
const queueDrawerVariants = {
    closed: (windowBarStyle) => ({
        height: windowBarStyle === Platform.WINDOWS || Platform.MACOS
            ? 'calc(100vh - 205px)'
            : 'calc(100vh - 175px)',
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: '75px',
        transition: {
            duration: 0.4,
            ease: 'anticipate',
        },
        width: '450px',
        x: '50vw',
    }),
    open: (windowBarStyle) => ({
        boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.8)',
        height: windowBarStyle === Platform.WINDOWS || Platform.MACOS
            ? 'calc(100vh - 205px)'
            : 'calc(100vh - 175px)',
        position: 'absolute',
        right: '20px',
        top: '75px',
        transition: {
            damping: 10,
            delay: 0,
            duration: 0.4,
            ease: 'anticipate',
            mass: 0.5,
        },
        width: '450px',
        x: 0,
        zIndex: 120,
    }),
};
const queueDrawerButtonVariants = {
    hidden: {
        opacity: 0,
        transition: { duration: 0.2 },
        x: 100,
    },
    visible: {
        opacity: 0.5,
        transition: { duration: 0.1, ease: 'anticipate' },
        x: 0,
    },
};
export const SideDrawerQueue = () => {
    const location = useLocation();
    const [drawer, drawerHandler] = useDisclosure(false);
    const rightExpanded = useAppStore((state) => state.sidebar.rightExpanded);
    const drawerTimeout = useTimeout(() => drawerHandler.open(), 500);
    const handleEnterDrawerButton = useCallback(() => {
        drawerTimeout.start();
    }, [drawerTimeout]);
    const handleLeaveDrawerButton = useCallback(() => {
        drawerTimeout.clear();
    }, [drawerTimeout]);
    const isQueueDrawerButtonVisible = !rightExpanded && !drawer && location.pathname !== AppRoute.NOW_PLAYING;
    return (_jsxs(_Fragment, { children: [_jsx(AnimatePresence, { initial: false, mode: "wait", children: isQueueDrawerButtonVisible && (_jsx(motion.div, { animate: "visible", className: styles.queueDrawerArea, exit: "hidden", initial: "hidden", onMouseEnter: handleEnterDrawerButton, onMouseLeave: handleLeaveDrawerButton, variants: queueDrawerButtonVariants, whileHover: { opacity: 1, scale: 2, transition: { duration: 0.5 } }, children: _jsx(Icon, { icon: "arrowLeftToLine", size: "lg" }) }, "queue-drawer-button")) }), _jsx(motion.div, { animate: drawer ? 'open' : 'closed', className: styles.queueDrawer, initial: "closed", onMouseLeave: () => {
                    setTimeout(() => {
                        if (useAppStore.getState().isReorderingQueue)
                            return;
                        drawerHandler.close();
                    }, 50);
                }, variants: queueDrawerVariants, children: _jsx(DrawerPlayQueue, {}) })] }));
};

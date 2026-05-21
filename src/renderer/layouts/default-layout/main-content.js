import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import clsx from 'clsx';
import { motion } from 'motion/react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { shallow } from 'zustand/shallow';
import samoLogoUrl from '../../../../build/samologo.svg?url';
import styles from './main-content.module.css';
import { ExpandedListContainer } from '/@/renderer/components/item-list/expanded-list-container';
import { ExpandedListItem } from '/@/renderer/components/item-list/expanded-list-item';
import { GlobalSearchBar } from '/@/renderer/features/search/components/global-search-bar';
import { AppMenu } from '/@/renderer/features/titlebar/components/app-menu';
import { FullScreenOverlay } from '/@/renderer/layouts/default-layout/full-screen-overlay';
import { FullScreenVisualizerOverlay } from '/@/renderer/layouts/default-layout/full-screen-visualizer-overlay';
import { LeftSidebar } from '/@/renderer/layouts/default-layout/left-sidebar';
import { RightSidebar } from '/@/renderer/layouts/default-layout/right-sidebar';
import { useAppStore, useAppStoreActions, useFullScreenPlayerStore, useGlobalExpanded, useSideQueueLayout, useSideQueueType, } from '/@/renderer/store';
import { constrainRightSidebarWidth, constrainSidebarWidth } from '/@/renderer/utils';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
const MINIMUM_SIDEBAR_WIDTH = 260;
export const MainContent = ({ shell }) => {
    const { collapsed, leftWidth, rightExpanded, rightHeight, rightWidth } = useAppStore((state) => ({
        collapsed: state.sidebar.collapsed,
        leftWidth: state.sidebar.leftWidth,
        rightExpanded: state.sidebar.rightExpanded,
        rightHeight: state.sidebar.rightHeight,
        rightWidth: state.sidebar.rightWidth,
    }), shallow);
    const { setSideBar } = useAppStoreActions();
    const sideQueueType = useSideQueueType();
    const sideQueueLayout = useSideQueueLayout();
    const isFullScreenPlayerExpanded = useFullScreenPlayerStore((state) => state.expanded);
    const [isResizing, setIsResizing] = useState(false);
    const [isResizingRight, setIsResizingRight] = useState(false);
    const rightSidebarRef = useRef(null);
    const mainContentRef = useRef(null);
    const initialRightWidthRef = useRef(rightWidth);
    const initialRightHeightRef = useRef(rightHeight);
    const initialMouseXRef = useRef(0);
    const initialMouseYRef = useRef(0);
    const wasCollapsedDuringDragRef = useRef(false);
    useEffect(() => {
        if (mainContentRef.current && !isResizing && !isResizingRight) {
            mainContentRef.current.style.setProperty('--sidebar-width', leftWidth);
            mainContentRef.current.style.setProperty('--right-sidebar-width', rightWidth);
            mainContentRef.current.style.setProperty('--right-sidebar-height', rightHeight);
            initialRightWidthRef.current = rightWidth;
            initialRightHeightRef.current = rightHeight;
        }
    }, [leftWidth, rightWidth, rightHeight, isResizing, isResizingRight]);
    const startResizing = useCallback((position, mouseEvent) => {
        if (position === 'left') {
            setIsResizing(true);
            wasCollapsedDuringDragRef.current = false;
        }
        else {
            setIsResizingRight(true);
            if (mainContentRef.current && rightSidebarRef.current && mouseEvent) {
                if (position === 'top') {
                    const currentHeight = mainContentRef.current.style.getPropertyValue('--right-sidebar-height');
                    if (currentHeight) {
                        initialRightHeightRef.current = currentHeight;
                    }
                    else {
                        initialRightHeightRef.current = rightHeight;
                    }
                    initialMouseYRef.current = mouseEvent.clientY;
                }
                else {
                    const currentWidth = mainContentRef.current.style.getPropertyValue('--right-sidebar-width');
                    if (currentWidth) {
                        initialRightWidthRef.current = currentWidth;
                    }
                    else {
                        initialRightWidthRef.current = rightWidth;
                    }
                    initialMouseXRef.current = mouseEvent.clientX;
                }
            }
            else {
                if (position === 'top') {
                    initialRightHeightRef.current = rightHeight;
                }
                else {
                    initialRightWidthRef.current = rightWidth;
                }
            }
        }
    }, [rightHeight, rightWidth]);
    const stopResizing = useCallback(() => {
        if (isResizing && mainContentRef.current) {
            if (!wasCollapsedDuringDragRef.current) {
                const finalWidth = mainContentRef.current.style.getPropertyValue('--sidebar-width');
                if (finalWidth) {
                    setSideBar({ collapsed: false, leftWidth: finalWidth });
                }
            }
            setIsResizing(false);
            wasCollapsedDuringDragRef.current = false;
        }
        else if (isResizingRight && mainContentRef.current) {
            if (sideQueueLayout === 'vertical') {
                const finalHeight = mainContentRef.current.style.getPropertyValue('--right-sidebar-height');
                if (finalHeight) {
                    setSideBar({ rightHeight: finalHeight });
                }
            }
            else {
                const finalWidth = mainContentRef.current.style.getPropertyValue('--right-sidebar-width');
                if (finalWidth) {
                    setSideBar({ rightWidth: finalWidth });
                }
            }
            setIsResizingRight(false);
        }
    }, [isResizing, isResizingRight, setSideBar, sideQueueLayout]);
    const resize = useCallback((mouseMoveEvent) => {
        if (!mainContentRef.current)
            return;
        if (isResizing) {
            const width = mouseMoveEvent.clientX;
            const constrainedWidthValue = constrainSidebarWidth(width);
            const constrainedWidth = `${constrainedWidthValue}px`;
            if (width < MINIMUM_SIDEBAR_WIDTH - 100) {
                if (!wasCollapsedDuringDragRef.current) {
                    wasCollapsedDuringDragRef.current = true;
                    setSideBar({ collapsed: true });
                }
            }
            else {
                if (wasCollapsedDuringDragRef.current) {
                    wasCollapsedDuringDragRef.current = false;
                    setSideBar({ collapsed: false });
                }
                mainContentRef.current.style.setProperty('--sidebar-width', constrainedWidth);
            }
        }
        else if (isResizingRight) {
            if (sideQueueLayout === 'vertical') {
                const initialHeight = Number(initialRightHeightRef.current.split('px')[0]);
                const initialMouseY = initialMouseYRef.current;
                const deltaY = mouseMoveEvent.clientY - initialMouseY;
                const containerHeight = mainContentRef.current.clientHeight;
                const minHeight = 220;
                const maxHeight = Math.max(minHeight, containerHeight - 200);
                const newHeight = initialHeight - deltaY;
                const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
                mainContentRef.current.style.setProperty('--right-sidebar-height', `${clampedHeight}px`);
            }
            else {
                const initialWidth = Number(initialRightWidthRef.current.split('px')[0]);
                const initialMouseX = initialMouseXRef.current;
                const deltaX = mouseMoveEvent.clientX - initialMouseX;
                const newWidth = initialWidth - deltaX;
                const width = `${constrainRightSidebarWidth(newWidth)}px`;
                mainContentRef.current.style.setProperty('--right-sidebar-width', width);
            }
        }
    }, [isResizing, isResizingRight, setSideBar, sideQueueLayout]);
    useEffect(() => {
        if (!isResizing && !isResizingRight) {
            return;
        }
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, isResizingRight, resize, stopResizing]);
    return (_jsxs(motion.div, { className: clsx(styles.mainContentContainer, {
            [styles.fullScreenPlayerExpanded]: isFullScreenPlayerExpanded,
            [styles.rightExpanded]: rightExpanded && sideQueueType === 'sideQueue',
            [styles.shell]: shell,
            [styles.sidebarCollapsed]: collapsed,
            [styles.sidebarExpanded]: !collapsed,
            [styles.verticalLayout]: rightExpanded &&
                sideQueueType === 'sideQueue' &&
                sideQueueLayout === 'vertical',
        }), id: "main-content", ref: mainContentRef, children: [!shell && (_jsxs(_Fragment, { children: [_jsx(FullScreenVisualizerOverlay, {}), _jsx(FullScreenOverlay, {}), _jsxs("div", { className: styles.chromeRow, children: [_jsx(GlobalSearchBar, { className: styles.globalChrome }), _jsx(ShellChromeControls, {})] }), _jsx(LeftSidebar, { isResizing: isResizing, startResizing: startResizing }), _jsx(RightSidebar, { isResizing: isResizingRight, ref: rightSidebarRef, startResizing: startResizing })] })), _jsx(MainContentBody, {})] }));
};
function GlobalExpandedPanel() {
    const globalExpanded = useGlobalExpanded();
    if (!globalExpanded)
        return null;
    return (_jsx(ExpandedListContainer, { children: _jsx(ExpandedListItem, { item: globalExpanded.item, itemType: globalExpanded.itemType }) }));
}
function MainContentBody() {
    return (_jsxs("div", { className: styles.mainContentBody, children: [_jsx("div", { className: styles.mainContentBodyScroll, children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(Outlet, {}) }) }), _jsx(GlobalExpandedPanel, {})] }));
}
function ShellChromeControls() {
    const navigate = useNavigate();
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles['chrome-navigation-controls'], children: [_jsx("button", { "aria-label": "Back", className: styles['chrome-shell-button'], onClick: () => navigate(-1), type: "button", children: _jsx(Icon, { icon: "arrowLeftS", size: "lg" }) }), _jsx("button", { "aria-label": "Forward", className: styles['chrome-shell-button'], onClick: () => navigate(1), type: "button", children: _jsx(Icon, { icon: "arrowRightS", size: "lg" }) })] }), _jsx("div", { className: styles.shellChromeControls, children: _jsxs(DropdownMenu, { position: "bottom-end", children: [_jsx(DropdownMenu.Target, { children: _jsx("button", { "aria-label": "Open app menu", className: styles['chrome-shell-button'], type: "button", children: _jsx("img", { alt: "Samo", className: styles['chrome-shell-logo'], src: samoLogoUrl }) }) }), _jsx(DropdownMenu.Dropdown, { children: _jsx(AppMenu, {}) })] }) })] }));
}

import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useRef } from 'react';
import styles from './left-sidebar.module.css';
import { ResizeHandle } from '/@/renderer/features/shared/components/resize-handle';
import { useAppStore } from '/@/renderer/store';
const CollapsedSidebar = lazy(() => import('/@/renderer/features/sidebar/components/collapsed-sidebar').then((module) => ({
    default: module.CollapsedSidebar,
})));
const Sidebar = lazy(() => import('/@/renderer/features/sidebar/components/sidebar').then((module) => ({
    default: module.Sidebar,
})));
export const LeftSidebar = ({ isResizing, startResizing }) => {
    const sidebarRef = useRef(null);
    const collapsed = useAppStore((state) => state.sidebar.collapsed);
    return (_jsxs("aside", { className: styles.container, id: "sidebar", children: [_jsx(ResizeHandle, { isResizing: isResizing, onMouseDown: (e) => {
                    e.preventDefault();
                    startResizing('left');
                }, placement: "right", ref: sidebarRef }), _jsx(Suspense, { fallback: _jsx(_Fragment, {}), children: collapsed ? _jsx(CollapsedSidebar, {}) : _jsx(Sidebar, {}) })] }));
};

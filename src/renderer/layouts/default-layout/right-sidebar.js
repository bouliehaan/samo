import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import clsx from 'clsx';
import { forwardRef } from 'react';
import styles from './right-sidebar.module.css';
import { SidebarPlayQueue } from '/@/renderer/features/now-playing/components/sidebar-play-queue';
import { ResizeHandle } from '/@/renderer/features/shared/components/resize-handle';
import { useAppStore, useSideQueueLayout, useSideQueueType } from '/@/renderer/store';
export const RightSidebar = forwardRef(({ isResizing: isResizingRight, startResizing }, ref) => {
    const rightExpanded = useAppStore((state) => state.sidebar.rightExpanded);
    const sideQueueType = useSideQueueType();
    const sideQueueLayout = useSideQueueLayout();
    const isVerticalLayout = sideQueueLayout === 'vertical';
    return (_jsx(_Fragment, { children: rightExpanded && sideQueueType === 'sideQueue' && (_jsxs("aside", { className: clsx(styles.rightSidebarContainer, {
                [styles.verticalLayout]: isVerticalLayout,
            }), id: "sidebar-queue", children: [_jsx(ResizeHandle, { isResizing: isResizingRight, onMouseDown: (e) => {
                        e.preventDefault();
                        startResizing(isVerticalLayout ? 'top' : 'right', e.nativeEvent);
                    }, placement: isVerticalLayout ? 'top' : 'left', ref: ref }), _jsx(SidebarPlayQueue, {})] }, "queue-sidebar")) }));
});

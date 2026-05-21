import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'motion/react';
import { createContext, useContext, useMemo, useState } from 'react';
import styles from './list-with-sidebar-container.module.css';
import { useListContext } from '/@/renderer/context/list-context';
import { animationProps } from '/@/shared/components/animations/animation-props';
import { Portal } from '/@/shared/components/portal/portal';
const ListWithSidebarContainerContext = createContext(null);
function Sidebar({ children }) {
    const context = useContext(ListWithSidebarContainerContext);
    if (!context) {
        throw new Error('Sidebar must be used within ListWithSidebarContainer');
    }
    if (!context.sidebarElement) {
        return null;
    }
    return (_jsx(Portal, { target: context.sidebarElement, children: _jsx(motion.div, { ...animationProps.slideInLeft, style: { height: '100%', width: '100%' }, children: children }) }));
}
function SidebarPortal({ children }) {
    const context = useContext(ListWithSidebarContainerContext);
    if (!context) {
        throw new Error('SidebarPortal must be used within ListWithSidebarContainer');
    }
    if (!context.sidebarElement) {
        return null;
    }
    return _jsx(Portal, { target: context.sidebarElement, children: children });
}
export const ListWithSidebarContainer = ({ children, useBreakpoint = false, }) => {
    const [sidebarElement, setSidebarElement] = useState(null);
    const { isSidebarOpen = false } = useListContext();
    const contextValue = useMemo(() => ({
        sidebarElement,
    }), [sidebarElement]);
    return (_jsx(ListWithSidebarContainerContext.Provider, { value: contextValue, children: _jsxs("div", { className: styles.container, "data-sidebar-open": useBreakpoint ? undefined : isSidebarOpen, "data-use-breakpoint": useBreakpoint, children: [_jsx("div", { className: styles.sidebarContainer, ref: setSidebarElement }), _jsx("div", { className: styles.contentContainer, children: children })] }) }));
};
ListWithSidebarContainer.Sidebar = Sidebar;
ListWithSidebarContainer.SidebarPortal = SidebarPortal;

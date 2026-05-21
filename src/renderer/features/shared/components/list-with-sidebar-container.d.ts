import { ReactNode } from 'react';
interface ListWithSidebarContainerProps {
    children: ReactNode;
    sidebarBreakpoint?: number;
    useBreakpoint?: boolean;
}
interface SidebarPortalProps {
    children: ReactNode;
}
interface SidebarProps {
    children: ReactNode;
}
declare function Sidebar({ children }: SidebarProps): import("react/jsx-runtime").JSX.Element | null;
declare function SidebarPortal({ children }: SidebarPortalProps): import("react/jsx-runtime").JSX.Element | null;
export declare const ListWithSidebarContainer: {
    ({ children, useBreakpoint, }: ListWithSidebarContainerProps): import("react/jsx-runtime").JSX.Element;
    Sidebar: typeof Sidebar;
    SidebarPortal: typeof SidebarPortal;
};
export {};

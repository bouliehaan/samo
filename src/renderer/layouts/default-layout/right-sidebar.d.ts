interface RightSidebarProps {
    isResizing: boolean;
    startResizing: (direction: 'left' | 'right' | 'top', mouseEvent?: MouseEvent) => void;
}
export declare const RightSidebar: import("react").ForwardRefExoticComponent<RightSidebarProps & import("react").RefAttributes<HTMLDivElement>>;
export {};

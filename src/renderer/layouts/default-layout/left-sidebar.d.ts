interface LeftSidebarProps {
    isResizing: boolean;
    startResizing: (direction: 'left' | 'right', mouseEvent?: MouseEvent) => void;
}
export declare const LeftSidebar: ({ isResizing, startResizing }: LeftSidebarProps) => import("react/jsx-runtime").JSX.Element;
export {};

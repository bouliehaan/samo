import { HTMLAttributes } from 'react';
interface ResizeHandleProps extends HTMLAttributes<HTMLDivElement> {
    isResizing: boolean;
    placement: 'bottom' | 'left' | 'right' | 'top';
}
export declare const ResizeHandle: import("react").ForwardRefExoticComponent<ResizeHandleProps & import("react").RefAttributes<HTMLDivElement>>;
export {};

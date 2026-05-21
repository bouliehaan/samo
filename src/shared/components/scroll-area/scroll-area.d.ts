import './scroll-area.css';
interface ScrollAreaProps extends React.ComponentPropsWithoutRef<'div'> {
    allowDragScroll?: boolean;
    debugScrollPosition?: boolean;
    scrollHideDelay?: number;
    scrollX?: boolean;
    scrollY?: boolean;
}
export declare const ScrollArea: import("react").ForwardRefExoticComponent<ScrollAreaProps & import("react").RefAttributes<HTMLDivElement>>;
export {};

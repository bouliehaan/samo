import { ReactNode, RefObject } from 'react';
import { FlexProps } from '/@/shared/components/flex/flex';
export interface PageHeaderProps extends Omit<FlexProps, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
    animated?: boolean;
    backgroundColor?: string;
    children?: ReactNode;
    height?: string;
    isHidden?: boolean;
    position?: string;
    scrollContainerRef?: RefObject<HTMLDivElement | null>;
    target?: RefObject<HTMLElement | null>;
}
export declare const PageHeader: import("react").MemoExoticComponent<({ animated, backgroundColor, children, height, isHidden, position, scrollContainerRef, target, ...props }: PageHeaderProps) => import("react/jsx-runtime").JSX.Element>;

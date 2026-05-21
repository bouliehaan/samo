import { type CSSProperties } from 'react';
interface SkeletonProps {
    baseColor?: string;
    borderRadius?: string;
    className?: string;
    containerClassName?: string;
    count?: number;
    direction?: 'ltr' | 'rtl';
    enableAnimation?: boolean;
    height?: number | string;
    inline?: boolean;
    isCentered?: boolean;
    style?: CSSProperties;
    width?: number | string;
}
export declare function BaseSkeleton({ baseColor, borderRadius, className, containerClassName, count, direction, enableAnimation, height, inline, isCentered, style, width, }: SkeletonProps): import("react/jsx-runtime").JSX.Element;
export declare const Skeleton: import("react").MemoExoticComponent<typeof BaseSkeleton>;
export {};

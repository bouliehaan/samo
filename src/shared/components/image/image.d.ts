import { HTMLAttributes, type ImgHTMLAttributes, ReactNode } from 'react';
import { AppIcon } from '/@/shared/components/icon/icon';
import { ImageRequest } from '/@/shared/types/domain-types';
export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    containerClassName?: string;
    enableAnimation?: boolean;
    enableDebounce?: boolean;
    enableViewport?: boolean;
    fetchPriority?: 'auto' | 'high' | 'low';
    imageContainerProps?: Omit<ImageContainerProps, 'children'>;
    imageRequest?: ImageRequest;
    includeLoader?: boolean;
    includeUnloader?: boolean;
    isExplicit?: boolean;
    src: string | undefined;
    unloaderIcon?: keyof typeof AppIcon;
}
interface ImageContainerProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    isExplicit?: boolean;
}
interface ImageLoaderProps {
    className?: string;
}
interface ImageUnloaderProps {
    className?: string;
    icon?: keyof typeof AppIcon;
}
export declare const FALLBACK_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1IiBkPSJNMCAwaDMwMHYzMDBIMHoiLz48L3N2Zz4=";
export declare function BaseImage({ className, containerClassName, enableAnimation, enableDebounce, enableViewport, fetchPriority, imageContainerProps, imageRequest, includeLoader, includeUnloader, isExplicit, onError, onLoad, src, unloaderIcon, ...props }: ImageProps): import("react/jsx-runtime").JSX.Element;
export declare const Image: import("react").MemoExoticComponent<typeof BaseImage>;
export declare function ImageLoader({ className }: ImageLoaderProps): import("react/jsx-runtime").JSX.Element;
export declare function ImageUnloader({ className, icon }: ImageUnloaderProps): import("react/jsx-runtime").JSX.Element;
export {};

import { LoadingOverlayProps as MantineLoadingOverlayProps } from '@mantine/core';
interface LoadingOverlayProps extends MantineLoadingOverlayProps {
    color?: string;
    opacity?: number;
}
export declare const LoadingOverlay: ({ ...props }: LoadingOverlayProps) => import("react/jsx-runtime").JSX.Element;
export {};

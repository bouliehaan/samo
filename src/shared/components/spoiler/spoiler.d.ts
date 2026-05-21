import { SpoilerProps as MantineSpoilerProps } from '@mantine/core';
import { ReactNode } from 'react';
interface SpoilerProps extends Omit<MantineSpoilerProps, 'hideLabel' | 'showLabel'> {
    children?: ReactNode;
    hideLabel?: ReactNode;
    showLabel?: ReactNode;
}
export declare const Spoiler: ({ children, hideLabel, maxHeight, showLabel, ...props }: SpoilerProps) => import("react/jsx-runtime").JSX.Element;
export {};

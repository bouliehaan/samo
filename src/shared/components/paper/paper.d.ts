import type { PaperProps as MantinePaperProps } from '@mantine/core';
import { ReactNode } from 'react';
export interface PaperProps extends MantinePaperProps {
    children?: ReactNode;
}
export declare const Paper: import("react").MemoExoticComponent<{
    ({ children, classNames, style, ...props }: PaperProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
}>;

import type { SelectProps as MantineSelectProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface SelectProps extends MantineSelectProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const Select: ({ allowDeselect, classNames, clearable, maxWidth, variant, width, ...props }: SelectProps) => import("react/jsx-runtime").JSX.Element;

import { MultiSelectProps as MantineMultiSelectProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface MultiSelectProps extends MantineMultiSelectProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const MultiSelect: ({ classNames, maxWidth, variant, width, ...props }: MultiSelectProps) => import("react/jsx-runtime").JSX.Element;

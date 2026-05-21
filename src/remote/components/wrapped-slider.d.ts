import { SliderProps } from '@mantine/core';
import { ReactNode } from 'react';
export interface WrappedProps extends Omit<SliderProps, 'onChangeEnd'> {
    leftLabel?: ReactNode;
    onChangeEnd: (value: number) => void;
    rightLabel?: ReactNode;
    value: number;
}
export declare const WrappedSlider: ({ leftLabel, rightLabel, value, ...props }: WrappedProps) => import("react/jsx-runtime").JSX.Element;

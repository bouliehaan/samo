import { NumberInputProps as MantineNumberInputProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface NumberInputProps extends MantineNumberInputProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const NumberInput: import("react").ForwardRefExoticComponent<NumberInputProps & import("react").RefAttributes<HTMLInputElement>>;

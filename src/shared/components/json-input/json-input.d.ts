import { JsonInputProps as MantineJsonInputProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface JsonInputProps extends MantineJsonInputProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const JsonInput: import("react").ForwardRefExoticComponent<JsonInputProps & import("react").RefAttributes<HTMLTextAreaElement>>;

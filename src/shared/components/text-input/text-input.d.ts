import { TextInputProps as MantineTextInputProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface TextInputProps extends MantineTextInputProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const TextInput: import("react").ForwardRefExoticComponent<TextInputProps & import("react").RefAttributes<HTMLInputElement>>;

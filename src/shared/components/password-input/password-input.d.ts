import { PasswordInputProps as MantinePasswordInputProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface PasswordInputProps extends MantinePasswordInputProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const PasswordInput: import("react").ForwardRefExoticComponent<PasswordInputProps & import("react").RefAttributes<HTMLInputElement>>;

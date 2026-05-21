import { TextareaProps as MantineTextareaProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface TextareaProps extends MantineTextareaProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const Textarea: import("react").ForwardRefExoticComponent<TextareaProps & import("react").RefAttributes<HTMLTextAreaElement>>;

import { FileInputProps as MantineFileInputProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface FileInputProps extends MantineFileInputProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const FileInput: import("react").ForwardRefExoticComponent<FileInputProps & import("react").RefAttributes<HTMLButtonElement>>;

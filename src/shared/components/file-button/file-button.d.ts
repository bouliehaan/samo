import { FileButtonProps as MantineFileButtonProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface FileButtonProps extends MantineFileButtonProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const FileButton: (<Multiple extends boolean = false>(props: MantineFileButtonProps<Multiple>) => React.ReactElement) & {
    displayName?: string;
};

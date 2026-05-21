import { ElementProps, BoxProps as MantineBoxProps } from '@mantine/core';
export interface BoxProps extends ElementProps<'div', keyof MantineBoxProps>, MantineBoxProps {
}
export declare const Box: import("react").MemoExoticComponent<({ children, ...props }: BoxProps) => import("react/jsx-runtime").JSX.Element>;

import { DrawerProps as MantineDrawerProps } from '@mantine/core';
import { ReactNode } from 'react';
interface DrawerProps extends MantineDrawerProps {
    children?: ReactNode;
}
export declare const Drawer: ({ children, ...props }: DrawerProps) => import("react/jsx-runtime").JSX.Element;
export {};

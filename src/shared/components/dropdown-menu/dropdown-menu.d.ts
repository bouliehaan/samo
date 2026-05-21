import type { MenuDividerProps as MantineMenuDividerProps, MenuDropdownProps as MantineMenuDropdownProps, MenuItemProps as MantineMenuItemProps, MenuLabelProps as MantineMenuLabelProps, MenuProps as MantineMenuProps } from '@mantine/core';
import { ReactNode } from 'react';
export interface MenuItemProps extends MantineMenuItemProps {
    children: ReactNode;
    isDanger?: boolean;
    isSelected?: boolean;
}
type MenuDividerProps = MantineMenuDividerProps;
type MenuDropdownProps = MantineMenuDropdownProps;
type MenuLabelProps = MantineMenuLabelProps;
type MenuProps = MantineMenuProps;
export declare const DropdownMenu: {
    ({ children, ...props }: MenuProps): import("react/jsx-runtime").JSX.Element;
    Label: ({ children, ...props }: MenuLabelProps) => import("react/jsx-runtime").JSX.Element;
    Item: (<C = "button">(props: import("@mantine/core").PolymorphicComponentProps<C, MenuItemProps>) => React.ReactElement) & Omit<import("react").FunctionComponent<(MenuItemProps & {
        component?: any;
    } & Omit<Omit<any, "ref">, "component" | keyof MenuItemProps> & {
        ref?: any;
        renderRoot?: (props: any) => any;
    }) | (MenuItemProps & {
        component: React.ElementType;
        renderRoot?: (props: Record<string, any>) => any;
    })>, never> & Record<string, never>;
    Target: import("react").ForwardRefExoticComponent<import("@mantine/core").MenuTargetProps & import("react").RefAttributes<HTMLElement>>;
    Dropdown: ({ children, ...props }: MenuDropdownProps) => import("react/jsx-runtime").JSX.Element;
    Divider: ({ ...props }: MenuDividerProps) => import("react/jsx-runtime").JSX.Element;
};
export {};

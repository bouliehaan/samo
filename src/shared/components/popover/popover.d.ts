import type { PopoverDropdownProps as MantinePopoverDropdownProps, PopoverProps as MantinePopoverProps } from '@mantine/core';
export interface PopoverDropdownProps extends MantinePopoverDropdownProps {
}
export interface PopoverProps extends MantinePopoverProps {
}
export declare const Popover: {
    ({ children, ...props }: PopoverProps): import("react/jsx-runtime").JSX.Element;
    Target: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").PopoverTargetProps;
        ref: HTMLElement;
        compound: true;
    }>;
    Dropdown: import("@mantine/core").MantineComponent<{
        props: import("node_modules/@mantine/core/lib/components/Popover").PopoverDropdownProps;
        ref: HTMLDivElement;
        stylesNames: import("@mantine/core").PopoverStylesNames;
        compound: true;
    }>;
};

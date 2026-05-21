import { HoverCardProps as MantineHoverCardProps } from '@mantine/core';
interface HoverCardProps extends MantineHoverCardProps {
}
export declare const HoverCard: {
    ({ children, classNames, ...props }: HoverCardProps): import("react/jsx-runtime").JSX.Element;
    Target: import("react").ForwardRefExoticComponent<import("@mantine/core").HoverCardTargetProps & import("react").RefAttributes<HTMLElement>>;
    Dropdown: typeof import("@mantine/core").HoverCardDropdown;
};
export {};

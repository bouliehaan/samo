import { Tooltip as MantineTooltip, TooltipProps as MantineTooltipProps } from '@mantine/core';
export interface TooltipProps extends MantineTooltipProps {
}
declare const TooltipComponent: import("react").MemoExoticComponent<({ children, classNames, openDelay, transitionProps, withinPortal, ...props }: TooltipProps) => import("react/jsx-runtime").JSX.Element>;
export declare const Tooltip: typeof TooltipComponent & {
    Group: typeof MantineTooltip.Group;
};
export {};

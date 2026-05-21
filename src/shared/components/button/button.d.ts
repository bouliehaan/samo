import type { ButtonVariant, ButtonProps as MantineButtonProps } from '@mantine/core';
import { ElementProps } from '@mantine/core';
import { TooltipProps } from '/@/shared/components/tooltip/tooltip';
export interface ButtonProps extends ElementProps<'button', keyof MantineButtonProps>, MantineButtonProps, MantineButtonProps {
    tooltip?: Omit<TooltipProps, 'children'>;
    uppercase?: boolean;
    variant?: ExtendedButtonVariant;
}
type ExtendedButtonVariant = 'state-error' | 'state-info' | 'state-success' | 'state-warning' | ButtonVariant;
export declare const _Button: import("react").ForwardRefExoticComponent<ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
export declare const Button: (<C = "button">(props: import("@mantine/core").PolymorphicComponentProps<C, ButtonProps>) => React.ReactElement) & Omit<import("react").FunctionComponent<(ButtonProps & {
    component?: any;
} & Omit<Omit<any, "ref">, keyof ButtonProps | "component"> & {
    ref?: any;
    renderRoot?: (props: any) => any;
}) | (ButtonProps & {
    component: React.ElementType;
    renderRoot?: (props: Record<string, any>) => any;
})>, never> & Record<string, never>;
export declare const ButtonGroup: import("@mantine/core").MantineComponent<{
    props: import("@mantine/core").ButtonGroupProps;
    ref: HTMLDivElement;
    stylesNames: import("@mantine/core").ButtonGroupStylesNames;
    vars: import("@mantine/core").ButtonGroupCssVariables;
}>;
export declare const ButtonGroupSection: import("@mantine/core").MantineComponent<{
    props: import("@mantine/core").ButtonGroupSectionProps;
    ref: HTMLDivElement;
    stylesNames: import("@mantine/core").ButtonGroupSectionStylesNames;
    vars: import("@mantine/core").ButtonGroupSectionCssVariables;
    variant: ButtonVariant;
}>;
interface TimeoutButtonProps extends ButtonProps {
    timeoutProps: {
        callback: () => void;
        duration: number;
    };
}
export declare const TimeoutButton: ({ timeoutProps, ...props }: TimeoutButtonProps) => import("react/jsx-runtime").JSX.Element;
export {};

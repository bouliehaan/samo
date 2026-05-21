import { ElementProps, ActionIconProps as MantineActionIconProps } from '@mantine/core';
import { AppIcon, IconProps } from '/@/shared/components/icon/icon';
import { TooltipProps } from '/@/shared/components/tooltip/tooltip';
export interface ActionIconProps extends ElementProps<'button', keyof MantineActionIconProps>, MantineActionIconProps {
    icon?: keyof typeof AppIcon;
    iconProps?: Omit<IconProps, 'icon'>;
    stopsPropagation?: boolean;
    tooltip?: Omit<TooltipProps, 'children'>;
}
export declare const ActionIcon: (<C = "button">(props: import("@mantine/core").PolymorphicComponentProps<C, ActionIconProps>) => React.ReactElement) & Omit<import("react").FunctionComponent<(ActionIconProps & {
    component?: any;
} & Omit<Omit<any, "ref">, "component" | keyof ActionIconProps> & {
    ref?: any;
    renderRoot?: (props: any) => any;
}) | (ActionIconProps & {
    component: React.ElementType;
    renderRoot?: (props: Record<string, any>) => any;
})>, never> & Record<string, never>;
export declare const ActionIconGroup: import("@mantine/core").MantineComponent<{
    props: import("@mantine/core").ActionIconGroupProps;
    ref: HTMLDivElement;
    stylesNames: import("@mantine/core").ActionIconGroupStylesNames;
    vars: import("@mantine/core").ActionIconGroupCssVariables;
}>;
export declare const ActionIconSection: import("@mantine/core").MantineComponent<{
    props: import("@mantine/core").ActionIconGroupSectionProps;
    ref: HTMLDivElement;
    stylesNames: import("@mantine/core").ActionIconGroupSectionStylesNames;
    vars: import("@mantine/core").ActionIconGroupSectionCssVariables;
    variant: import("@mantine/core").ActionIconVariant;
}>;

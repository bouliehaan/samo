import { ElementProps, BadgeProps as MantineBadgeProps } from '@mantine/core';
export interface BadgeProps extends ElementProps<'div', keyof MantineBadgeProps>, MantineBadgeProps {
}
export declare const Badge: (<C = "button">(props: import("@mantine/core").PolymorphicComponentProps<C, BadgeProps>) => React.ReactElement) & Omit<import("react").FunctionComponent<(BadgeProps & {
    component?: any;
} & Omit<Omit<any, "ref">, "component" | keyof BadgeProps> & {
    ref?: any;
    renderRoot?: (props: any) => any;
}) | (BadgeProps & {
    component: React.ElementType;
    renderRoot?: (props: Record<string, any>) => any;
})>, never> & Record<string, never>;

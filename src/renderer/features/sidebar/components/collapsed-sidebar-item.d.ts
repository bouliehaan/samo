import { ReactNode } from 'react';
interface CollapsedSidebarItemProps {
    activeIcon: ReactNode;
    disabled?: boolean;
    icon: ReactNode;
    label: string;
    route?: string;
}
export declare const CollapsedSidebarItem: (<C = "button">(props: import("@mantine/core").PolymorphicComponentProps<C, CollapsedSidebarItemProps>) => React.ReactElement) & Omit<import("react").FunctionComponent<(CollapsedSidebarItemProps & {
    component?: any;
} & Omit<Omit<any, "ref">, "component" | keyof CollapsedSidebarItemProps> & {
    ref?: any;
    renderRoot?: (props: any) => any;
}) | (CollapsedSidebarItemProps & {
    component: React.ElementType;
    renderRoot?: (props: Record<string, any>) => any;
})>, never> & Record<string, never>;
export {};

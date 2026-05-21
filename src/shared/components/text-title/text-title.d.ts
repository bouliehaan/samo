import type { TitleProps as MantineTitleProps } from '@mantine/core';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
type MantineTextTitleDivProps = ComponentPropsWithoutRef<'div'> & MantineTitleProps;
interface TextTitleProps extends MantineTextTitleDivProps {
    children?: ReactNode;
    isLink?: boolean;
    isMuted?: boolean;
    isNoSelect?: boolean;
    overflow?: 'hidden' | 'visible';
    to?: string;
    weight?: number;
}
export declare const TextTitle: (<C = "div">(props: import("@mantine/core").PolymorphicComponentProps<C, TextTitleProps>) => React.ReactElement) & Omit<import("react").FunctionComponent<(TextTitleProps & {
    component?: any;
} & Omit<Omit<any, "ref">, "component" | keyof TextTitleProps> & {
    ref?: any;
    renderRoot?: (props: any) => any;
}) | (TextTitleProps & {
    component: React.ElementType;
    renderRoot?: (props: Record<string, any>) => any;
})>, never> & Record<string, never>;
export {};

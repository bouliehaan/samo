import { TextProps as MantineTextProps } from '@mantine/core';
import { ComponentPropsWithoutRef, ReactNode } from 'react';
export interface TextProps extends MantineTextDivProps {
    children?: ReactNode;
    font?: Font;
    isLink?: boolean;
    isMuted?: boolean;
    isNoSelect?: boolean;
    overflow?: 'hidden' | 'visible';
    to?: string;
    weight?: number;
}
type Font = 'Epilogue' | 'Gotham' | 'Inter' | 'Poppins';
type MantineTextDivProps = ComponentPropsWithoutRef<'div'> & MantineTextProps;
export declare const BaseText: ({ children, font, isLink, isMuted, isNoSelect, overflow, weight, ...rest }: TextProps) => import("react/jsx-runtime").JSX.Element;
export declare const Text: (<C = "div">(props: import("@mantine/core").PolymorphicComponentProps<C, TextProps>) => React.ReactElement) & Omit<import("react").FunctionComponent<(TextProps & {
    component?: any;
} & Omit<Omit<any, "ref">, "component" | keyof TextProps> & {
    ref?: any;
    renderRoot?: (props: any) => any;
}) | (TextProps & {
    component: React.ElementType;
    renderRoot?: (props: Record<string, any>) => any;
})>, never> & Record<string, never>;
export {};

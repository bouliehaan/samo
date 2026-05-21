import { PillGroupProps as MantinePillGroupProps, PillProps as MantinePillProps } from '@mantine/core';
import { Link } from 'react-router';
interface PillProps extends MantinePillProps {
}
export declare const Pill: {
    ({ children, classNames, radius, size, ...props }: PillProps): import("react/jsx-runtime").JSX.Element;
    Group: ({ children, classNames, gap, ...props }: PillGroupProps) => import("react/jsx-runtime").JSX.Element;
};
interface PillGroupProps extends MantinePillGroupProps {
}
interface PillLinkProps extends Omit<React.ComponentPropsWithoutRef<typeof Link>, keyof PillProps>, PillProps {
}
export declare const PillLink: import("react").ForwardRefExoticComponent<PillLinkProps & import("react").RefAttributes<HTMLDivElement>>;
export {};

import { Command } from 'cmdk';
import { ComponentPropsWithoutRef, ReactNode } from 'react';
interface CommandItemSelectableProps extends Omit<ComponentPropsWithoutRef<typeof Command.Item>, 'children'> {
    children: (args: {
        isHighlighted: boolean;
    }) => ReactNode;
}
export declare function CommandItemSelectable({ children, ...itemProps }: CommandItemSelectableProps): import("react/jsx-runtime").JSX.Element;
export {};

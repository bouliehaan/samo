import { ReactNode } from 'react';
import { GroupProps } from '/@/shared/components/group/group';
interface OptionProps extends GroupProps {
    children: ReactNode;
}
export declare const Option: {
    ({ children, classNames, ...props }: OptionProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
    Label: ({ children }: LabelProps) => import("react/jsx-runtime").JSX.Element;
    Control: ({ children }: ControlProps) => import("react/jsx-runtime").JSX.Element;
};
interface LabelProps {
    children: ReactNode;
}
interface ControlProps {
    children: ReactNode;
}
export {};

import { LinkProps } from 'react-router';
import { ButtonProps } from '/@/shared/components/button/button';
interface SidebarItemProps extends ButtonProps {
    to: LinkProps['to'];
}
export declare const SidebarItem: ({ children, className, to, ...props }: SidebarItemProps) => import("react/jsx-runtime").JSX.Element;
export declare const MemoizedSidebarItem: import("react").MemoExoticComponent<({ children, className, to, ...props }: SidebarItemProps) => import("react/jsx-runtime").JSX.Element>;
export {};

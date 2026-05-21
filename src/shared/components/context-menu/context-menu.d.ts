import type { Dispatch, SetStateAction } from 'react';
import * as RadixContextMenu from '@radix-ui/react-context-menu';
import { type ReactNode } from 'react';
import { AppIcon } from '/@/shared/components/icon/icon';
interface ContextMenuContext {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
}
export declare const ContextMenuContext: import("react").Context<ContextMenuContext | null>;
interface ContentProps {
    bottomStickyContent?: ReactNode;
    children: ReactNode;
    onCloseAutoFocus?: (event: FocusEvent) => void;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    onFocusOutside?: (event: FocusEvent) => void;
    onPointerDownOutside?: (event: PointerEvent) => void;
    stickyContent?: ReactNode;
}
interface ContextMenuProps {
    children: ReactNode;
}
interface DividerProps {
}
interface ItemProps {
    children: ReactNode;
    className?: string;
    disabled?: boolean;
    isSelected?: boolean;
    leftIcon?: keyof typeof AppIcon;
    onSelect?: (event: Event) => void;
    rightIcon?: keyof typeof AppIcon;
}
interface LabelProps extends React.ComponentPropsWithoutRef<'div'> {
    children: ReactNode;
}
interface TargetProps {
    children: ReactNode;
}
export declare function ContextMenu(props: ContextMenuProps): import("react/jsx-runtime").JSX.Element;
export declare namespace ContextMenu {
    var Target: (props: TargetProps) => import("react/jsx-runtime").JSX.Element;
    var Content: (props: ContentProps) => import("react/jsx-runtime").JSX.Element;
    var Item: (props: ItemProps) => import("react/jsx-runtime").JSX.Element;
    var Label: (props: LabelProps) => import("react/jsx-runtime").JSX.Element;
    var Group: import("react").ForwardRefExoticComponent<RadixContextMenu.ContextMenuGroupProps & import("react").RefAttributes<HTMLDivElement>>;
    var Submenu: (props: SubmenuProps) => import("react/jsx-runtime").JSX.Element;
    var SubmenuTarget: (props: SubmenuTargetProps) => import("react/jsx-runtime").JSX.Element;
    var SubmenuContent: (props: SubmenuContentProps) => import("react/jsx-runtime").JSX.Element;
    var Divider: (props: DividerProps) => import("react/jsx-runtime").JSX.Element;
    var Arrow: import("react").ForwardRefExoticComponent<RadixContextMenu.ContextMenuArrowProps & import("react").RefAttributes<SVGSVGElement>>;
}
interface SubmenuContentProps {
    children: ReactNode;
    stickyContent?: ReactNode;
}
interface SubmenuProps {
    children: ReactNode;
    disabled?: boolean;
    isCloseDisabled?: boolean;
    open?: boolean;
}
interface SubmenuTargetProps {
    children: ReactNode;
}
export {};

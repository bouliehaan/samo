import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as RadixContextMenu from '@radix-ui/react-context-menu';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import styles from './context-menu.module.css';
import { animationVariants } from '/@/shared/components/animations/animation-variants';
import { Icon } from '/@/shared/components/icon/icon';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
export const ContextMenuContext = createContext(null);
export function ContextMenu(props) {
    const { children } = props;
    const [open, setOpen] = useState(false);
    const context = useMemo(() => ({ open, setOpen }), [open]);
    return (_jsx(RadixContextMenu.Root, { onOpenChange: setOpen, children: _jsx(ContextMenuContext.Provider, { value: context, children: children }) }));
}
function Content(props) {
    const { bottomStickyContent, children, stickyContent } = props;
    const { open } = useContext(ContextMenuContext);
    return (_jsx(AnimatePresence, { children: open && (_jsx(RadixContextMenu.Portal, { forceMount: true, children: _jsx(RadixContextMenu.Content, { asChild: true, className: styles.content, children: _jsxs(motion.div, { animate: "show", className: styles.content, exit: "hidden", initial: "hidden", children: [stickyContent, _jsx(ScrollArea, { className: styles.maxHeight, children: children }), bottomStickyContent] }) }) })) }));
}
function Divider(props) {
    return _jsx(RadixContextMenu.Separator, { ...props, className: styles.divider });
}
function Item(props) {
    const { children, className, disabled, isSelected, leftIcon, onSelect, rightIcon } = props;
    return (_jsxs(RadixContextMenu.Item, { className: clsx(styles.item, className, {
            [styles.disabled]: disabled,
            [styles.selected]: isSelected,
            [styles['has-left-icon']]: !!leftIcon,
            [styles['has-right-icon']]: !!rightIcon,
        }), disabled: disabled, onSelect: onSelect, children: [leftIcon && _jsx(Icon, { className: styles.leftIcon, icon: leftIcon }), children, rightIcon && _jsx(Icon, { className: styles.rightIcon, icon: rightIcon })] }));
}
function Label(props) {
    const { children, className, ...htmlProps } = props;
    return (_jsx(RadixContextMenu.Label, { className: clsx(styles.label, className), ...htmlProps, children: children }));
}
function Target(props) {
    const { children } = props;
    return (_jsx(RadixContextMenu.Trigger, { asChild: true, className: styles.target, children: children }));
}
const SubmenuContext = createContext(null);
function Submenu(props) {
    const { children, disabled, isCloseDisabled, open: isManuallyOpen } = props;
    const [open, setOpen] = useState(isManuallyOpen ?? false);
    const closeTimeoutRef = useRef(null);
    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);
    const cancelCloseTimeout = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };
    const setCloseTimeout = (timeout) => {
        closeTimeoutRef.current = timeout;
    };
    const context = useMemo(() => ({
        cancelCloseTimeout,
        disabled,
        isCloseDisabled,
        open,
        setCloseTimeout,
        setOpen,
    }), [disabled, isCloseDisabled, open]);
    return (_jsx(RadixContextMenu.Sub, { open: open, children: _jsx(SubmenuContext.Provider, { value: context, children: children }) }));
}
function SubmenuContent(props) {
    const { children, stickyContent } = props;
    const { cancelCloseTimeout, isCloseDisabled, open, setCloseTimeout, setOpen } = useContext(SubmenuContext);
    const handleMouseEnter = () => {
        cancelCloseTimeout();
        setOpen(true);
    };
    const handleMouseLeave = () => {
        if (isCloseDisabled) {
            const timeout = setTimeout(() => {
                setOpen(false);
            }, 150);
            setCloseTimeout(timeout);
        }
        else {
            setOpen(false);
        }
    };
    return (_jsx(Fragment, { children: open && (_jsx(RadixContextMenu.Portal, { forceMount: true, children: _jsx(RadixContextMenu.SubContent, { className: styles.content, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, children: _jsxs(motion.div, { animate: "show", className: styles.innerContent, initial: "hidden", variants: animationVariants.fadeIn, children: [stickyContent, _jsx(ScrollArea, { className: styles.maxHeight, children: children })] }) }) })) }));
}
function SubmenuTarget(props) {
    const { children } = props;
    const { cancelCloseTimeout, disabled, setCloseTimeout, setOpen } = useContext(SubmenuContext);
    const openTimeoutRef = useRef(null);
    useEffect(() => {
        return () => {
            if (openTimeoutRef.current) {
                clearTimeout(openTimeoutRef.current);
            }
        };
    }, []);
    const handleMouseEnter = () => {
        if (disabled)
            return;
        cancelCloseTimeout();
        if (openTimeoutRef.current) {
            clearTimeout(openTimeoutRef.current);
        }
        openTimeoutRef.current = setTimeout(() => {
            setOpen(true);
            openTimeoutRef.current = null;
        }, 150);
    };
    const handleMouseLeave = () => {
        if (openTimeoutRef.current) {
            clearTimeout(openTimeoutRef.current);
            openTimeoutRef.current = null;
        }
        const timeout = setTimeout(() => {
            setOpen(false);
        }, 150);
        setCloseTimeout(timeout);
    };
    return (_jsx(RadixContextMenu.SubTrigger, { className: clsx({ [styles.disabled]: disabled }), disabled: disabled, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, children: children }));
}
ContextMenu.Target = Target;
ContextMenu.Content = Content;
ContextMenu.Item = Item;
ContextMenu.Label = Label;
ContextMenu.Group = RadixContextMenu.Group;
ContextMenu.Submenu = Submenu;
ContextMenu.SubmenuTarget = SubmenuTarget;
ContextMenu.SubmenuContent = SubmenuContent;
ContextMenu.Divider = Divider;
ContextMenu.Arrow = RadixContextMenu.Arrow;

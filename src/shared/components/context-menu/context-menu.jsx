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
    return (<RadixContextMenu.Root onOpenChange={setOpen}>
            <ContextMenuContext.Provider value={context}>{children}</ContextMenuContext.Provider>
        </RadixContextMenu.Root>);
}
function Content(props) {
    const { bottomStickyContent, children, stickyContent } = props;
    const { open } = useContext(ContextMenuContext);
    return (<AnimatePresence>
            {open && (<RadixContextMenu.Portal forceMount>
                    <RadixContextMenu.Content asChild className={styles.content}>
                        <motion.div animate="show" className={styles.content} exit="hidden" initial="hidden">
                            {stickyContent}
                            <ScrollArea className={styles.maxHeight}>{children}</ScrollArea>
                            {bottomStickyContent}
                        </motion.div>
                    </RadixContextMenu.Content>
                </RadixContextMenu.Portal>)}
        </AnimatePresence>);
}
function Divider(props) {
    return <RadixContextMenu.Separator {...props} className={styles.divider}/>;
}
function Item(props) {
    const { children, className, disabled, isSelected, leftIcon, onSelect, rightIcon } = props;
    return (<RadixContextMenu.Item className={clsx(styles.item, className, {
            [styles.disabled]: disabled,
            [styles.selected]: isSelected,
            [styles['has-left-icon']]: !!leftIcon,
            [styles['has-right-icon']]: !!rightIcon,
        })} disabled={disabled} onSelect={onSelect}>
            {leftIcon && <Icon className={styles.leftIcon} icon={leftIcon}/>}
            {children}
            {rightIcon && <Icon className={styles.rightIcon} icon={rightIcon}/>}
        </RadixContextMenu.Item>);
}
function Label(props) {
    const { children, className, ...htmlProps } = props;
    return (<RadixContextMenu.Label className={clsx(styles.label, className)} {...htmlProps}>
            {children}
        </RadixContextMenu.Label>);
}
function Target(props) {
    const { children } = props;
    return (<RadixContextMenu.Trigger asChild className={styles.target}>
            {children}
        </RadixContextMenu.Trigger>);
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
    return (<RadixContextMenu.Sub open={open}>
            <SubmenuContext.Provider value={context}>{children}</SubmenuContext.Provider>
        </RadixContextMenu.Sub>);
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
    return (<Fragment>
            {open && (<RadixContextMenu.Portal forceMount>
                    <RadixContextMenu.SubContent className={styles.content} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                        <motion.div animate="show" className={styles.innerContent} initial="hidden" variants={animationVariants.fadeIn}>
                            {stickyContent}
                            <ScrollArea className={styles.maxHeight}>{children}</ScrollArea>
                        </motion.div>
                    </RadixContextMenu.SubContent>
                </RadixContextMenu.Portal>)}
        </Fragment>);
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
    return (<RadixContextMenu.SubTrigger className={clsx({ [styles.disabled]: disabled })} disabled={disabled} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
        </RadixContextMenu.SubTrigger>);
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

import { jsx as _jsx } from "react/jsx-runtime";
import { Popover as MantinePopover } from '@mantine/core';
import styles from './popover.module.css';
const getTransition = (position) => {
    if (position?.includes('top')) {
        return 'fade-up';
    }
    if (position?.includes('bottom')) {
        return 'fade-down';
    }
    if (position?.includes('left')) {
        return 'fade-left';
    }
    if (position?.includes('right')) {
        return 'fade-right';
    }
    return 'fade';
};
export const Popover = ({ children, ...props }) => {
    return (_jsx(MantinePopover, { classNames: {
            dropdown: styles.dropdown,
        }, closeOnClickOutside: true, closeOnEscape: true, offset: 10, transitionProps: { transition: getTransition(props.position) }, withArrow: false, withinPortal: true, ...props, children: children }));
};
Popover.Target = MantinePopover.Target;
Popover.Dropdown = MantinePopover.Dropdown;

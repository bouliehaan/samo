import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import { memo } from 'react';
import { Link, useLocation } from 'react-router';
import styles from './sidebar-item.module.css';
import { Button } from '/@/shared/components/button/button';
export const SidebarItem = ({ children, className, to, ...props }) => {
    const location = useLocation();
    const toPath = typeof to === 'string' ? to : to.pathname || '';
    const isActive = location.pathname === toPath;
    const handleLinkDragStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    return (_jsx(Button, { className: clsx({
            [styles.active]: isActive,
            [styles.disabled]: props.disabled,
            [styles.link]: true,
            [styles.root]: true,
        }, className), classNames: {
            inner: styles.inner,
            label: styles.label,
        }, component: Link, draggable: false, onDragStart: handleLinkDragStart, to: to, variant: "subtle", ...props, children: children }));
};
export const MemoizedSidebarItem = memo(SidebarItem);

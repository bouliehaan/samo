import { jsx as _jsx } from "react/jsx-runtime";
import { Pill as MantinePill, } from '@mantine/core';
import clsx from 'clsx';
import { forwardRef } from 'react';
import { Link } from 'react-router';
import styles from './pill.module.css';
export const Pill = ({ children, classNames, radius = 'md', size = 'md', ...props }) => {
    return (_jsx(MantinePill, { classNames: {
            label: clsx({
                [styles.label]: true,
                [styles.lg]: size === 'lg',
                [styles.md]: size === 'md',
                [styles.sm]: size === 'sm',
                [styles.xl]: size === 'xl',
                [styles.xs]: size === 'xs',
            }),
            remove: styles.remove,
            root: styles.root,
            ...classNames,
        }, radius: radius, size: size, ...props, children: children }));
};
const PillGroup = ({ children, classNames, gap = 'sm', ...props }) => {
    return (_jsx(MantinePill.Group, { classNames: {
            group: clsx(styles.group, {
                [styles.lg]: gap === 'lg',
                [styles.md]: gap === 'md',
                [styles.sm]: gap === 'sm',
                [styles.xl]: gap === 'xl',
                [styles.xs]: gap === 'xs',
            }),
            ...classNames,
        }, gap: gap, ...props, children: children }));
};
Pill.Group = PillGroup;
export const PillLink = forwardRef(({ children, ...props }, ref) => {
    const { classNames, radius = 'md', size = 'md', ...rest } = props;
    return (_jsx(MantinePill, { classNames: {
            label: clsx({
                [styles.label]: true,
                [styles.lg]: size === 'lg',
                [styles.md]: size === 'md',
                [styles.sm]: size === 'sm',
                [styles.xl]: size === 'xl',
                [styles.xs]: size === 'xs',
            }),
            remove: styles.remove,
            root: clsx(styles.root, styles.link),
            ...classNames,
        }, component: Link, radius: radius, ref: ref, size: size, ...rest, children: children }));
});

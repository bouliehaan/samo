import { jsx as _jsx } from "react/jsx-runtime";
import { Text as MantineText } from '@mantine/core';
import clsx from 'clsx';
import { useMemo } from 'react';
import styles from './text.module.css';
import { createPolymorphicComponent } from '/@/shared/utils/create-polymorphic-component';
export const BaseText = ({ children, font, isLink, isMuted, isNoSelect, overflow, weight, ...rest }) => {
    const classNames = useMemo(() => ({
        root: clsx(styles.root, {
            [styles.link]: isLink,
            [styles.muted]: isMuted,
            [styles.noSelect]: isNoSelect,
            [styles.overflowHidden]: overflow === 'hidden',
        }),
    }), [isLink, isMuted, isNoSelect, overflow]);
    const style = useMemo(() => ({
        '--font-family': font,
    }), [font]);
    return (_jsx(MantineText, { classNames: classNames, component: "div", fw: weight, style: style, ...rest, children: children }));
};
export const Text = createPolymorphicComponent(BaseText);

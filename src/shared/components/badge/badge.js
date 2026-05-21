import { jsx as _jsx } from "react/jsx-runtime";
import { Badge as MantineBadge, } from '@mantine/core';
import { useMemo } from 'react';
import styles from './badge.module.css';
import { createPolymorphicComponent } from '/@/shared/utils/create-polymorphic-component';
const BaseBadge = ({ children, classNames, variant = 'default', ...props }) => {
    const memoizedClassNames = useMemo(() => ({
        root: styles.root,
        ...classNames,
    }), [classNames]);
    return (_jsx(MantineBadge, { classNames: memoizedClassNames, radius: "md", variant: variant, ...props, children: children }));
};
export const Badge = createPolymorphicComponent(BaseBadge);

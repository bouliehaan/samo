import { jsx as _jsx } from "react/jsx-runtime";
import { Paper as MantinePaper } from '@mantine/core';
import { memo, useMemo } from 'react';
import styles from './paper.module.css';
const BasePaper = ({ children, classNames, style, ...props }) => {
    const memoizedClassNames = useMemo(() => ({
        root: styles.root,
        ...classNames,
    }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return (_jsx(MantinePaper, { classNames: memoizedClassNames, style: memoizedStyle, ...props, children: children }));
};
BasePaper.displayName = 'Paper';
export const Paper = memo(BasePaper);

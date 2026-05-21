import { Divider as MantineDivider } from '@mantine/core';
import { forwardRef, memo, useMemo } from 'react';
import styles from './divider.module.css';
const _Divider = forwardRef(({ classNames, style, ...props }, ref) => {
    const memoizedClassNames = useMemo(() => ({
        root: styles.root,
        ...classNames,
    }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return (<MantineDivider classNames={memoizedClassNames} ref={ref} style={memoizedStyle} {...props}/>);
});
_Divider.displayName = 'Divider';
export const Divider = memo(_Divider);

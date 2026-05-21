import { jsx as _jsx } from "react/jsx-runtime";
import { Fieldset as MantineFieldset } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './fieldset.module.css';
export const Fieldset = forwardRef(({ children, ...props }, ref) => {
    return (_jsx(MantineFieldset, { classNames: { root: styles.root }, ...props, ref: ref, children: children }));
});
Fieldset.displayName = 'Fieldset';

import { jsx as _jsx } from "react/jsx-runtime";
import { JsonInput as MantineJsonInput, } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './json-input.module.css';
export const JsonInput = forwardRef(({ children, classNames, maxWidth, size = 'sm', style, variant = 'default', width, ...props }, ref) => {
    return (_jsx(MantineJsonInput, { classNames: {
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            wrapper: styles.wrapper,
            ...classNames,
        }, ref: ref, size: size, style: { maxWidth, width, ...style }, variant: variant, ...props, children: children }));
});

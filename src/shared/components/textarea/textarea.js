import { jsx as _jsx } from "react/jsx-runtime";
import { Textarea as MantineTextarea } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './textarea.module.css';
export const Textarea = forwardRef(({ children, classNames, maxWidth, style, width, ...props }, ref) => {
    return (_jsx(MantineTextarea, { classNames: {
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            wrapper: styles.wrapper,
            ...classNames,
        }, ref: ref, style: { maxWidth, width, ...style }, ...props, children: children }));
});

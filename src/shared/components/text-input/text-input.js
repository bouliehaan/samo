import { jsx as _jsx } from "react/jsx-runtime";
import { TextInput as MantineTextInput, } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './text-input.module.css';
export const TextInput = forwardRef(({ children, classNames, maxWidth, size = 'sm', style, variant = 'default', width, ...props }, ref) => {
    return (_jsx(MantineTextInput, { classNames: {
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            wrapper: styles.wrapper,
            ...classNames,
        }, ref: ref, size: size, spellCheck: false, style: { maxWidth, width, ...style }, variant: variant, ...props, children: children }));
});

import { jsx as _jsx } from "react/jsx-runtime";
import { NumberInput as MantineNumberInput, } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './number-input.module.css';
export const NumberInput = forwardRef(({ children, classNames, defaultValue, maxWidth, onChange, size = 'sm', style, variant = 'default', width, ...props }, ref) => {
    return (_jsx(MantineNumberInput, { classNames: {
            control: styles.control,
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            wrapper: styles.wrapper,
            ...classNames,
        }, defaultValue: defaultValue, hideControls: true, onChange: onChange
            ? (e) => onChange(typeof e === 'number' ? e : defaultValue || e)
            : undefined, ref: ref, size: size, style: { maxWidth, width, ...style }, variant: variant, ...props, children: children }));
});

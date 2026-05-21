import { PasswordInput as MantinePasswordInput, } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './password-input.module.css';
export const PasswordInput = forwardRef(({ children, classNames, maxWidth, style, variant = 'default', width, ...props }, ref) => {
    return (<MantinePasswordInput classNames={{
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            ...classNames,
        }} ref={ref} style={{ maxWidth, width, ...style }} variant={variant} {...props}>
                {children}
            </MantinePasswordInput>);
});

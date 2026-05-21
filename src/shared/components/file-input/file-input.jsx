import { FileInput as MantineFileInput, } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './file-input.module.css';
export const FileInput = forwardRef(({ children, classNames, maxWidth, size = 'sm', style, variant = 'default', width, ...props }, ref) => {
    return (<MantineFileInput classNames={{
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            wrapper: styles.wrapper,
            ...classNames,
        }} ref={ref} size={size} style={{ maxWidth, width, ...style }} variant={variant} {...props}>
                {children}
            </MantineFileInput>);
});

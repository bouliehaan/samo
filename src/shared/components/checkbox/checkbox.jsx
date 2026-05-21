import { Checkbox as MantineCheckbox } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './checkbox.module.css';
export const Checkbox = forwardRef(({ classNames, ...props }, ref) => {
    return (<MantineCheckbox classNames={{
            body: styles.body,
            input: styles.input,
            label: styles.label,
            ...classNames,
        }} ref={ref} {...props}/>);
});

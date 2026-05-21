import { jsx as _jsx } from "react/jsx-runtime";
import { DateInput as MantineDateInput, DateTimePicker as MantineDateTimeInput, } from '@mantine/dates';
import styles from './date-picker.module.css';
export const DateInput = ({ classNames, maxWidth, size = 'sm', style, width, ...props }) => {
    return (_jsx(MantineDateInput, { classNames: {
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            ...classNames,
        }, size: size, style: { maxWidth, width, ...style }, ...props }));
};
export const DateTimeInput = ({ classNames, maxWidth, size = 'sm', style, width, ...props }) => {
    return (_jsx(MantineDateTimeInput, { classNames: {
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            ...classNames,
        }, size: size, style: { maxWidth, width, ...style }, ...props }));
};

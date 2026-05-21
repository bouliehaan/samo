import { DateInput as MantineDateInput, DateTimePicker as MantineDateTimeInput, } from '@mantine/dates';
import styles from './date-picker.module.css';
export const DateInput = ({ classNames, maxWidth, size = 'sm', style, width, ...props }) => {
    return (<MantineDateInput classNames={{
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            ...classNames,
        }} size={size} style={{ maxWidth, width, ...style }} {...props}/>);
};
export const DateTimeInput = ({ classNames, maxWidth, size = 'sm', style, width, ...props }) => {
    return (<MantineDateTimeInput classNames={{
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            ...classNames,
        }} size={size} style={{ maxWidth, width, ...style }} {...props}/>);
};

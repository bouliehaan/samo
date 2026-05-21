import { DateTimePicker as MantineDateTimePicker } from '@mantine/dates';
import styles from './date-time-picker.module.css';
export const DateTimePicker = ({ classNames, maxWidth, popoverProps, size = 'sm', style, width, ...props }) => {
    return (<MantineDateTimePicker classNames={{
            input: styles.input,
            label: styles.label,
            required: styles.required,
            root: styles.root,
            section: styles.section,
            ...classNames,
        }} popoverProps={{ withinPortal: true, ...popoverProps }} size={size} style={{ maxWidth, width, ...style }} {...props}/>);
};

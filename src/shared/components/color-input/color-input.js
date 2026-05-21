import { jsx as _jsx } from "react/jsx-runtime";
import { ColorInput as MantineColorInput, } from '@mantine/core';
import styles from './color-input.module.css';
export const ColorInput = ({ classNames, size = 'sm', variant = 'default', ...props }) => {
    return (_jsx(MantineColorInput, { classNames: {
            dropdown: styles.dropdown,
            input: styles.input,
            label: styles.label,
            root: styles.root,
            ...classNames,
        }, size: size, variant: variant, ...props }));
};

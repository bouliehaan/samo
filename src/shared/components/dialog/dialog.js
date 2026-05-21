import { jsx as _jsx } from "react/jsx-runtime";
import { Dialog as MantineDialog } from '@mantine/core';
import styles from './dialog.module.css';
export const Dialog = ({ classNames, style, ...props }) => {
    return (_jsx(MantineDialog, { classNames: { closeButton: styles.closeButton, root: styles.root, ...classNames }, style: {
            ...style,
        }, ...props }));
};

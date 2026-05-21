import { Dialog as MantineDialog } from '@mantine/core';
import styles from './dialog.module.css';
export const Dialog = ({ classNames, style, ...props }) => {
    return (<MantineDialog classNames={{ closeButton: styles.closeButton, root: styles.root, ...classNames }} style={{
            ...style,
        }} {...props}/>);
};

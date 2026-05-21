import { Code as MantineCode } from '@mantine/core';
import styles from './code.module.css';
export const Code = ({ classNames, ...props }) => {
    return (<MantineCode {...props} classNames={{
            ...classNames,
            root: styles.root,
        }} spellCheck={false}/>);
};

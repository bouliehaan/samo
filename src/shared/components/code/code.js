import { jsx as _jsx } from "react/jsx-runtime";
import { Code as MantineCode } from '@mantine/core';
import styles from './code.module.css';
export const Code = ({ classNames, ...props }) => {
    return (_jsx(MantineCode, { ...props, classNames: {
            ...classNames,
            root: styles.root,
        }, spellCheck: false }));
};

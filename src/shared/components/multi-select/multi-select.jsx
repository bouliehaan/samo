import { MultiSelect as MantineMultiSelect, } from '@mantine/core';
import { useMemo } from 'react';
import styles from './multi-select.module.css';
const defaultClassNames = {
    dropdown: styles.dropdown,
    input: styles.input,
    label: styles.label,
    option: styles.option,
    pill: styles.pill,
    pillsList: styles.pillsList,
    root: styles.root,
};
const defaultClearButtonProps = {
    classNames: {
        root: styles.clearButton,
    },
    variant: 'transparent',
};
export const MultiSelect = ({ classNames, maxWidth, variant = 'default', width, ...props }) => {
    const mergedClassNames = useMemo(() => (classNames ? { ...defaultClassNames, ...classNames } : defaultClassNames), [classNames]);
    const style = useMemo(() => (maxWidth || width ? { maxWidth, width } : undefined), [maxWidth, width]);
    return (<MantineMultiSelect classNames={mergedClassNames} clearButtonProps={defaultClearButtonProps} style={style} variant={variant} withCheckIcon={false} {...props}/>);
};

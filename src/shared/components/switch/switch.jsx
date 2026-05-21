import { Switch as MantineSwitch } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './switch.module.css';
export const Switch = forwardRef(({ classNames, ...props }, ref) => {
    return (<MantineSwitch classNames={{
            input: styles.input,
            root: styles.root,
            thumb: styles.thumb,
            track: styles.track,
            ...classNames,
        }} ref={ref} withThumbIndicator={false} {...props}/>);
});

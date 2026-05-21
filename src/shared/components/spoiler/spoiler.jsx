import { Spoiler as MantineSpoiler } from '@mantine/core';
import { useState } from 'react';
import styles from './spoiler.module.css';
import { Icon } from '/@/shared/components/icon/icon';
export const Spoiler = ({ children, hideLabel, maxHeight = 56, showLabel, ...props }) => {
    const [expanded, setExpanded] = useState(false);
    return (<MantineSpoiler classNames={{ content: styles.spoiler, control: styles.control }} expanded={expanded} maxHeight={maxHeight} {...props} hideLabel={hideLabel ?? <Icon icon="arrowUpS" size="lg"/>} onClick={() => setExpanded(!expanded)} showLabel={showLabel ?? <Icon icon="arrowDownS" size="lg"/>}>
            {children}
        </MantineSpoiler>);
};

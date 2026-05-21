import { jsx as _jsx } from "react/jsx-runtime";
import { Spoiler as MantineSpoiler } from '@mantine/core';
import { useState } from 'react';
import styles from './spoiler.module.css';
import { Icon } from '/@/shared/components/icon/icon';
export const Spoiler = ({ children, hideLabel, maxHeight = 56, showLabel, ...props }) => {
    const [expanded, setExpanded] = useState(false);
    return (_jsx(MantineSpoiler, { classNames: { content: styles.spoiler, control: styles.control }, expanded: expanded, maxHeight: maxHeight, ...props, hideLabel: hideLabel ?? _jsx(Icon, { icon: "arrowUpS", size: "lg" }), onClick: () => setExpanded(!expanded), showLabel: showLabel ?? _jsx(Icon, { icon: "arrowDownS", size: "lg" }), children: children }));
};

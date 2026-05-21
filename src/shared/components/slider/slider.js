import { jsx as _jsx } from "react/jsx-runtime";
import { Slider as MantineSlider } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './slider.module.css';
export const Slider = forwardRef(({ classNames, style, ...props }, ref) => {
    return (_jsx(MantineSlider, { classNames: {
            bar: styles.bar,
            label: styles.label,
            thumb: styles.thumb,
            track: styles.track,
            ...classNames,
        }, ref: ref, style: {
            ...style,
        }, ...props }));
});

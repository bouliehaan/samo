import { Rating as MantineRating } from '@mantine/core';
import clsx from 'clsx';
import debounce from 'lodash/debounce';
import { useCallback } from 'react';
import styles from './rating.module.css';
export const Rating = ({ classNames, onChange, preventDefault = true, size, stopPropagation = true, style, ...props }) => {
    const valueChange = useCallback((rating) => {
        if (onChange) {
            if (rating === props.value) {
                onChange(0);
            }
            else {
                onChange(rating);
            }
        }
    }, [onChange, props.value]);
    const debouncedOnChange = debounce(valueChange, 100);
    return (<MantineRating classNames={{
            root: clsx(styles.root, {
                [styles.lg]: size === 'lg',
                [styles.md]: size === 'md',
                [styles.sm]: size === 'sm',
                [styles.xl]: size === 'xl',
                [styles.xs]: size === 'xs',
            }),
            symbolBody: styles.symbolBody,
            ...classNames,
        }} style={{
            ...style,
        }} {...props} onChange={(e) => {
            debouncedOnChange(e);
        }} onClick={(e) => {
            if (preventDefault) {
                e.preventDefault();
            }
            if (stopPropagation) {
                e.stopPropagation();
            }
        }}/>);
};

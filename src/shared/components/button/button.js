import { jsx as _jsx } from "react/jsx-runtime";
import { Button as MantineButton } from '@mantine/core';
import clsx from 'clsx';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './button.module.css';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { useTimeout } from '/@/shared/hooks/use-timeout';
import { createPolymorphicComponent } from '/@/shared/utils/create-polymorphic-component';
export const _Button = forwardRef(({ children, classNames, loading, size = 'sm', style, tooltip, uppercase, variant = 'default', ...props }, ref) => {
    const memoizedClassNames = useMemo(() => ({
        inner: styles.inner,
        label: clsx(styles.label, {
            [styles.uppercase]: uppercase,
        }),
        loader: styles.loader,
        root: styles.root,
        section: styles.section,
        ...classNames,
    }), [classNames, uppercase]);
    if (tooltip) {
        return (_jsx(Tooltip, { withinPortal: true, ...tooltip, children: _jsx(MantineButton, { autoContrast: true, classNames: memoizedClassNames, loading: loading, ref: ref, size: size, style: style, variant: variant, ...props, children: children }) }));
    }
    return (_jsx(MantineButton, { classNames: memoizedClassNames, loading: loading, ref: ref, size: size, style: style, variant: variant, ...props, children: children }));
});
export const Button = createPolymorphicComponent(_Button);
export const ButtonGroup = MantineButton.Group;
export const ButtonGroupSection = MantineButton.GroupSection;
export const TimeoutButton = ({ timeoutProps, ...props }) => {
    const [, setTimeoutRemaining] = useState(timeoutProps.duration);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef(null);
    const callback = () => {
        timeoutProps.callback();
        setTimeoutRemaining(timeoutProps.duration);
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsRunning(false);
    };
    const { clear, start } = useTimeout(callback, timeoutProps.duration);
    useEffect(() => {
        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);
    const startTimeout = useCallback(() => {
        if (isRunning) {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsRunning(false);
            clear();
        }
        else {
            setIsRunning(true);
            start();
            const intervalId = window.setInterval(() => {
                setTimeoutRemaining((prev) => prev - 100);
            }, 100);
            intervalRef.current = intervalId;
        }
    }, [clear, isRunning, start]);
    return (_jsx(Button, { onClick: startTimeout, ...props, children: isRunning ? 'Cancel' : props.children }));
};

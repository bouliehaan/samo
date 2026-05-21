import { jsx as _jsx } from "react/jsx-runtime";
import { Center } from '@mantine/core';
import { memo } from 'react';
import { CgSpinnerTwo } from 'react-icons/cg';
import styles from './spinner.module.css';
export const SpinnerIcon = CgSpinnerTwo;
const _Spinner = ({ ...props }) => {
    if (props.container) {
        return (_jsx(Center, { className: styles.container, children: _jsx(SpinnerIcon, { className: styles.icon, color: props.color, size: props.size }) }));
    }
    return _jsx(SpinnerIcon, { className: styles.icon, color: props.color, size: props.size });
};
_Spinner.displayName = 'Spinner';
export const Spinner = memo(_Spinner);

import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import { forwardRef } from 'react';
import styles from './resize-handle.module.css';
export const ResizeHandle = forwardRef(({ isResizing, placement, ...props }, ref) => {
    return (_jsx("div", { className: clsx({
            [styles.handle]: true,
            [styles.resizing]: isResizing,
            [styles[`handle-${placement}`]]: true,
        }), ref: ref, ...props }));
});

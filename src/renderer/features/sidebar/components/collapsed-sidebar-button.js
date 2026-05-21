import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import styles from './collapsed-sidebar-button.module.css';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const CollapsedSidebarButton = forwardRef(({ children, ...props }, ref) => {
    return (_jsx(ActionIcon, { className: styles.button, ref: ref, variant: "subtle", ...props, children: children }));
});

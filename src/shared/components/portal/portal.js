import { jsx as _jsx } from "react/jsx-runtime";
import { Portal as MantinePortal } from '@mantine/core';
export const Portal = ({ children, ...props }) => {
    return _jsx(MantinePortal, { ...props, children: children });
};

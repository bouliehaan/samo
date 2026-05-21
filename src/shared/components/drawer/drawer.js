import { jsx as _jsx } from "react/jsx-runtime";
import { Drawer as MantineDrawer } from '@mantine/core';
export const Drawer = ({ children, ...props }) => {
    return _jsx(MantineDrawer, { ...props, children: children });
};

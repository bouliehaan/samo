import { jsx as _jsx } from "react/jsx-runtime";
import { CopyButton as MantineCopyButton, } from '@mantine/core';
export const CopyButton = ({ children, ...props }) => {
    return _jsx(MantineCopyButton, { ...props, children: children });
};

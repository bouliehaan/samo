import { jsx as _jsx } from "react/jsx-runtime";
import { Breadcrumbs as MantineBreadcrumbs, } from '@mantine/core';
export const Breadcrumb = ({ children, ...props }) => {
    return _jsx(MantineBreadcrumbs, { ...props, children: children });
};

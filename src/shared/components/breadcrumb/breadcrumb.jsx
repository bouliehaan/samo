import { Breadcrumbs as MantineBreadcrumbs, } from '@mantine/core';
export const Breadcrumb = ({ children, ...props }) => {
    return <MantineBreadcrumbs {...props}>{children}</MantineBreadcrumbs>;
};

import { Portal as MantinePortal } from '@mantine/core';
export const Portal = ({ children, ...props }) => {
    return <MantinePortal {...props}>{children}</MantinePortal>;
};

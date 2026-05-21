import { Drawer as MantineDrawer } from '@mantine/core';
export const Drawer = ({ children, ...props }) => {
    return <MantineDrawer {...props}>{children}</MantineDrawer>;
};

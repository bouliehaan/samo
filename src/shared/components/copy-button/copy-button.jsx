import { CopyButton as MantineCopyButton, } from '@mantine/core';
export const CopyButton = ({ children, ...props }) => {
    return <MantineCopyButton {...props}>{children}</MantineCopyButton>;
};

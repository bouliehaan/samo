import { Box as MantineBox } from '@mantine/core';
import { memo } from 'react';
export const Box = memo(({ children, ...props }) => {
    return <MantineBox {...props}>{children}</MantineBox>;
});
Box.displayName = 'Box';

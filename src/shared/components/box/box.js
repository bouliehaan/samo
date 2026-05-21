import { jsx as _jsx } from "react/jsx-runtime";
import { Box as MantineBox } from '@mantine/core';
import { memo } from 'react';
export const Box = memo(({ children, ...props }) => {
    return _jsx(MantineBox, { ...props, children: children });
});
Box.displayName = 'Box';

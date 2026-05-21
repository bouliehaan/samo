import { jsx as _jsx } from "react/jsx-runtime";
import { Grid as MantineGrid } from '@mantine/core';
import { memo, useMemo } from 'react';
const BaseGrid = ({ classNames, style, ...props }) => {
    const memoizedClassNames = useMemo(() => ({ ...classNames }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return _jsx(MantineGrid, { classNames: memoizedClassNames, style: memoizedStyle, ...props });
};
BaseGrid.displayName = 'Grid';
export const Grid = memo(BaseGrid);
Grid.Col = MantineGrid.Col;

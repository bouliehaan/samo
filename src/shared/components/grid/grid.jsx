import { Grid as MantineGrid } from '@mantine/core';
import { memo, useMemo } from 'react';
const BaseGrid = ({ classNames, style, ...props }) => {
    const memoizedClassNames = useMemo(() => ({ ...classNames }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return <MantineGrid classNames={memoizedClassNames} style={memoizedStyle} {...props}/>;
};
BaseGrid.displayName = 'Grid';
export const Grid = memo(BaseGrid);
Grid.Col = MantineGrid.Col;

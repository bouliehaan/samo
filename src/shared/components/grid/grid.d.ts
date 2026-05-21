import { Grid as MantineGrid, GridProps as MantineGridProps } from '@mantine/core';
export interface GridProps extends MantineGridProps {
}
declare const BaseGrid: {
    ({ classNames, style, ...props }: GridProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const Grid: typeof BaseGrid & {
    Col: typeof MantineGrid.Col;
};
export {};

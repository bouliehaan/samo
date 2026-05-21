import { PaginationProps as MantinePaginationProps } from '@mantine/core';
interface PaginationProps extends MantinePaginationProps {
    containerClassName?: string;
    itemsPerPage: number;
    totalItemCount: number;
}
export declare const Pagination: ({ classNames, containerClassName, itemsPerPage, style, totalItemCount, ...props }: PaginationProps) => import("react/jsx-runtime").JSX.Element;
export {};

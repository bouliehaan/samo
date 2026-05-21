import { ReactNode } from 'react';
interface ItemListWithPaginationProps {
    children: ReactNode;
    currentPage: number;
    itemsPerPage: number;
    onChange: (e: number) => void;
    pageCount: number;
    totalItemCount: number;
}
export declare const ItemListWithPagination: ({ children, currentPage, itemsPerPage, onChange, pageCount, totalItemCount, }: ItemListWithPaginationProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import styles from './item-list-pagination.module.css';
import { Pagination } from '/@/shared/components/pagination/pagination';
export const ItemListWithPagination = ({ children, currentPage, itemsPerPage, onChange, pageCount, totalItemCount, }) => {
    return (_jsxs("div", { className: styles.container, children: [_jsx(Fragment, { children: children }, currentPage), _jsx("div", { className: styles.paginationContainer, children: _jsx(Pagination, { itemsPerPage: itemsPerPage, onChange: onChange, total: pageCount, totalItemCount: totalItemCount, value: currentPage }) })] }));
};

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { Fragment, useMemo } from 'react';
import { generatePath, Link } from 'react-router';
import styles from './genre-column.module.css';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { AppRoute } from '/@/renderer/router/routes';
import { Text } from '/@/shared/components/text/text';
const GenreColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const genres = useMemo(() => {
        if (!row)
            return [];
        return row.map((genre) => {
            const path = generatePath(AppRoute.LIBRARY_GENRES_DETAIL, {
                genreId: genre.id,
            });
            return { ...genre, path };
        });
    }, [row]);
    if (Array.isArray(row)) {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx("div", { className: clsx(styles.genresContainer, {
                    [styles.compact]: props.size === 'compact',
                    [styles.large]: props.size === 'large',
                }), children: genres.map((genre, index) => (_jsxs(Fragment, { children: [_jsx(Text, { component: Link, isLink: true, isMuted: true, isNoSelect: true, state: { item: genre }, to: genre.path, children: genre.name }), index < genres.length - 1 && ', '] }, genre.id))) }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
export { GenreColumn };

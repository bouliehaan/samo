import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { generatePath, Link } from 'react-router';
import styles from './genre-badge-column.module.css';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { AppRoute } from '/@/renderer/router/routes';
import { Badge } from '/@/shared/components/badge/badge';
import { Group } from '/@/shared/components/group/group';
import { stringToColor } from '/@/shared/utils/string-to-color';
const MAX_GENRES = 4;
const GenreBadgeColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.genres;
    const genres = useMemo(() => {
        if (!row)
            return [];
        return row.map((genre) => {
            const { color, isLight } = stringToColor(genre.name);
            const path = generatePath(AppRoute.LIBRARY_GENRES_DETAIL, { genreId: genre.id });
            return { ...genre, color, isLight, path };
        });
    }, [row]);
    if (Array.isArray(row)) {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx(Group, { className: styles.group, wrap: "wrap", children: genres.slice(0, MAX_GENRES).map((genre) => (_jsx(Badge, { component: Link, state: { item: genre }, style: {
                        backgroundColor: genre.color,
                        color: genre.isLight ? 'black' : 'white',
                    }, to: genre.path, children: genre.name }, genre.id))) }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
export { GenreBadgeColumn };

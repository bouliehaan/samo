import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import { useMemo } from 'react';
import { generatePath, Link } from 'react-router';
import styles from './album-column.module.css';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { AppRoute } from '/@/renderer/router/routes';
import { Text } from '/@/shared/components/text/text';
const AlbumColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const song = rowItem;
    const albumId = song?.albumId;
    const albumPath = useMemo(() => {
        if (!albumId)
            return null;
        return generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId });
    }, [albumId]);
    if (typeof row === 'string') {
        if (albumId && albumPath) {
            return (_jsx(TableColumnContainer, { ...props, children: _jsx("div", { className: clsx(styles.albumContainer, {
                        [styles.compact]: props.size === 'compact',
                        [styles.large]: props.size === 'large',
                    }), children: _jsx(Text, { className: styles.albumLink, component: Link, isLink: true, isMuted: true, isNoSelect: true, state: { item: song }, to: albumPath, children: row }) }) }));
        }
        return (_jsx(TableColumnContainer, { ...props, children: _jsx(Text, { className: clsx(styles.albumContainer, {
                    [styles.compact]: props.size === 'compact',
                    [styles.large]: props.size === 'large',
                }), isMuted: true, isNoSelect: true, children: row }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
export { AlbumColumn };

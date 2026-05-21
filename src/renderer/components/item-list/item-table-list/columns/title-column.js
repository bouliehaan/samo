import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { useMemo } from 'react';
import { Link } from 'react-router';
import styles from './title-column.module.css';
import { getTitlePath } from '/@/renderer/components/item-list/helpers/get-title-path';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { useIsActiveRow } from '/@/renderer/components/item-list/item-table-list/item-table-list-context';
import { ExplicitIndicator } from '/@/shared/components/explicit-indicator/explicit-indicator';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
const TitleColumnBase = (props) => {
    const { itemType } = props;
    switch (itemType) {
        case LibraryItem.FOLDER:
        case LibraryItem.PLAYLIST_SONG:
        case LibraryItem.QUEUE_SONG:
        case LibraryItem.SONG:
            return _jsx(QueueSongTitleColumn, { ...props });
        default:
            return _jsx(DefaultTitleColumn, { ...props });
    }
};
export const TitleColumn = TitleColumnBase;
function DefaultTitleColumn(props) {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const path = useMemo(() => {
        if (typeof row !== 'string' || !rowItem || !rowItem.id)
            return undefined;
        return getTitlePath(props.itemType, rowItem.id);
    }, [props.itemType, row, rowItem]);
    if (typeof row === 'string') {
        const item = rowItem;
        const titleLinkProps = path
            ? {
                component: Link,
                isLink: true,
                state: { item },
                to: path,
            }
            : {};
        return (_jsx(TableColumnContainer, { ...props, children: _jsxs(Text, { className: clsx({
                    [styles.compact]: props.size === 'compact',
                    [styles.large]: props.size === 'large',
                    [styles.nameContainer]: true,
                }), isNoSelect: true, ...titleLinkProps, children: [_jsx(ExplicitIndicator, { explicitStatus: item?.explicitStatus }), row] }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
}
function QueueSongTitleColumn(props) {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const song = rowItem;
    const isActive = useIsActiveRow(song?.id, song?._uniqueId);
    const path = useMemo(() => {
        if (typeof row !== 'string' || !rowItem || !rowItem.id)
            return undefined;
        return getTitlePath(props.itemType, rowItem.id);
    }, [props.itemType, row, rowItem]);
    if (typeof row === 'string') {
        const item = rowItem;
        const titleLinkProps = path
            ? {
                component: Link,
                isLink: true,
                state: { item },
                to: path,
            }
            : {};
        return (_jsx(TableColumnContainer, { ...props, children: _jsxs(Text, { className: clsx({
                    [styles.active]: isActive,
                    [styles.compact]: props.size === 'compact',
                    [styles.large]: props.size === 'large',
                    [styles.nameContainer]: true,
                }), isNoSelect: true, ...titleLinkProps, children: [_jsx(ExplicitIndicator, { explicitStatus: song?.explicitStatus }), row, song?.trackSubtitle && props.itemType !== LibraryItem.QUEUE_SONG && (_jsxs(Text, { className: clsx({
                            [styles.active]: isActive,
                        }), component: "span", isMuted: true, size: "sm", children: [' (', song.trackSubtitle, ')'] }))] }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
}

import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './text-column.module.css';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnTextContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
export const TextColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    if (typeof row === 'string' && row) {
        return (_jsx(TableColumnTextContainer, { className: clsx(styles.textContainer, {
                [styles.compact]: props.size === 'compact',
                [styles.large]: props.size === 'large',
            }), ...props, children: row }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};

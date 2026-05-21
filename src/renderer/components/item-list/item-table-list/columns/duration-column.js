import { jsx as _jsx } from "react/jsx-runtime";
import formatDuration from 'format-duration';
import { useMemo } from 'react';
import { ColumnNullFallback, ColumnSkeletonFixed, TableColumnTextContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
const DurationColumnBase = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const formattedDuration = useMemo(() => {
        return typeof row === 'number' ? formatDuration(row) : null;
    }, [row]);
    if (typeof row === 'number') {
        return _jsx(TableColumnTextContainer, { ...props, children: formattedDuration });
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonFixed, { ...props });
};
export const DurationColumn = DurationColumnBase;

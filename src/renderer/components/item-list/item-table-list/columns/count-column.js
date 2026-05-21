import { jsx as _jsx } from "react/jsx-runtime";
import { ColumnNullFallback, ColumnSkeletonFixed, TableColumnTextContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
export const CountColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    if (typeof row === 'number') {
        return (_jsx(TableColumnTextContainer, { ...props, children: row.toLocaleString() }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonFixed, { ...props });
};

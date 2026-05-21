import { jsx as _jsx } from "react/jsx-runtime";
import { ColumnNullFallback, ColumnSkeletonFixed, TableColumnTextContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
export const DefaultColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    if (typeof row === 'string') {
        return _jsx(TableColumnTextContainer, { ...props, children: row });
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonFixed, { ...props });
};

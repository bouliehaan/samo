import { jsx as _jsx } from "react/jsx-runtime";
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnTextContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
export const PathColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    if (typeof row === 'string' && row) {
        return (_jsx(TableColumnTextContainer, { ...props, children: _jsx("span", { children: row }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};

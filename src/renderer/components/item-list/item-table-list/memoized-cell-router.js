import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { createColumnCellComponents } from './cell-component-factory';
import { ItemTableListColumn } from './item-table-list-column';
const MemoizedCellRouterBase = (props) => {
    const columnType = props.columns[props.columnIndex]?.id;
    const ColumnComponent = props.columnCellComponents.get(columnType);
    if (ColumnComponent) {
        // eslint-disable-next-line react-hooks/static-components
        return _jsx(ColumnComponent, { ...props });
    }
    return _jsx(ItemTableListColumn, { ...props });
};
export const MemoizedCellRouter = MemoizedCellRouterBase;
export const useColumnCellComponents = (columns, itemType) => {
    const columnsKey = useMemo(() => columns.join(','), [columns]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => createColumnCellComponents(columns, itemType), [columnsKey, itemType]);
};

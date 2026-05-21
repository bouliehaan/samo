import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { ColumnNullFallback, ColumnSkeletonFixed, TableColumnTextContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { formatSizeString } from '/@/renderer/utils/format';
const SizeColumnBase = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const formattedSize = useMemo(() => {
        return typeof row === 'number' ? formatSizeString(row) : null;
    }, [row]);
    if (typeof row === 'number') {
        return _jsx(TableColumnTextContainer, { ...props, children: formattedSize });
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonFixed, { ...props });
};
export const SizeColumn = SizeColumnBase;

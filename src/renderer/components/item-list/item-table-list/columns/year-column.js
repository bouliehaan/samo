import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { ColumnNullFallback, ColumnSkeletonFixed, TableColumnTextContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { SEPARATOR_STRING } from '/@/shared/api/utils';
const YearColumnBase = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const item = rowItem;
    const yearDisplay = useMemo(() => {
        if (item && 'releaseYear' in item && item.releaseYear != null) {
            const releaseYear = item.releaseYear;
            const originalYear = 'originalYear' in item && item.originalYear > 0 ? item.originalYear : null;
            if (originalYear !== null && originalYear !== releaseYear) {
                return `${originalYear}${SEPARATOR_STRING}${releaseYear}`;
            }
            if (typeof releaseYear === 'number') {
                return releaseYear;
            }
        }
        return null;
    }, [item]);
    if (yearDisplay !== null) {
        return _jsx(TableColumnTextContainer, { ...props, children: yearDisplay });
    }
    const row = rowItem?.[props.columns[props.columnIndex].id];
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonFixed, { ...props });
};
export const YearColumn = YearColumnBase;

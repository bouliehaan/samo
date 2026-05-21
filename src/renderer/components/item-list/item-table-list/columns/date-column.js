import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { ColumnNullFallback, ColumnSkeletonFixed, TableColumnTextContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { formatDateAbsolute, formatDateRelative, formatPartialIsoDateUTC, } from '/@/renderer/utils/format';
import { SEPARATOR_STRING } from '/@/shared/api/utils';
import { TableColumn } from '/@/shared/types/types';
const DateColumnBase = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const formattedAbsolute = useMemo(() => (typeof row === 'string' && row ? formatDateAbsolute(row) : null), [row]);
    if (formattedAbsolute) {
        return (_jsx(TableColumnTextContainer, { ...props, children: _jsx("span", { children: formattedAbsolute }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonFixed, { ...props });
};
export const DateColumn = DateColumnBase;
const AbsoluteDateColumnBase = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const releaseDateContent = useMemo(() => {
        if (props.type === TableColumn.RELEASE_DATE) {
            const item = rowItem;
            if (item && 'releaseDate' in item && item.releaseDate) {
                const releaseDate = item.releaseDate;
                const originalDate = 'originalDate' in item && item.originalDate && item.originalDate !== releaseDate
                    ? item.originalDate
                    : null;
                if (originalDate) {
                    const formattedOriginalDate = formatPartialIsoDateUTC(originalDate);
                    const formattedReleaseDate = formatPartialIsoDateUTC(releaseDate);
                    return `${formattedOriginalDate}${SEPARATOR_STRING}${formattedReleaseDate}`;
                }
                if (typeof releaseDate === 'string' && releaseDate) {
                    return formatPartialIsoDateUTC(releaseDate);
                }
            }
        }
        return null;
    }, [props.type, rowItem]);
    const formattedIsoFallback = useMemo(() => (typeof row === 'string' && row ? formatPartialIsoDateUTC(row) : null), [row]);
    if (props.type === TableColumn.RELEASE_DATE) {
        if (releaseDateContent) {
            return (_jsx(TableColumnTextContainer, { ...props, children: _jsx("span", { children: releaseDateContent }) }));
        }
        if (formattedIsoFallback) {
            return (_jsx(TableColumnTextContainer, { ...props, children: _jsx("span", { children: formattedIsoFallback }) }));
        }
        if (row === null) {
            return _jsx(ColumnNullFallback, { ...props });
        }
        return _jsx(ColumnSkeletonFixed, { ...props });
    }
    return _jsx(ColumnSkeletonFixed, { ...props });
};
export const AbsoluteDateColumn = AbsoluteDateColumnBase;
const RelativeDateColumnBase = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const formattedRelative = useMemo(() => {
        if (typeof row !== 'string')
            return null;
        return formatDateRelative(row);
    }, [row]);
    if (formattedRelative !== null) {
        return (_jsx(TableColumnTextContainer, { ...props, children: _jsx("span", { children: formattedRelative }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonFixed, { ...props });
};
export const RelativeDateColumn = RelativeDateColumnBase;

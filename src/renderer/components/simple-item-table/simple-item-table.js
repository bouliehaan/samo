import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { memo, useId, useMemo } from 'react';
import styles from './simple-item-table.module.css';
import { createExtractRowId } from '/@/renderer/components/item-list/helpers/extract-row-id';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useItemListState, useItemSelectionState, } from '/@/renderer/components/item-list/helpers/item-list-state';
import { parseTableColumns } from '/@/renderer/components/item-list/helpers/parse-table-columns';
import { ItemTableListColumn } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { TableColumnHeaderContainer } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { Table } from '/@/shared/components/table/table';
var TableItemSize;
(function (TableItemSize) {
    TableItemSize[TableItemSize["COMPACT"] = 40] = "COMPACT";
    TableItemSize[TableItemSize["DEFAULT"] = 64] = "DEFAULT";
    TableItemSize[TableItemSize["LARGE"] = 88] = "LARGE";
})(TableItemSize || (TableItemSize = {}));
export const SimpleItemTable = ({ cellPadding = 'sm', columns, data, enableAlternateRowColors = false, enableHeader = true, enableHorizontalBorders = false, enableRowHoverHighlight = true, enableSelection = true, enableVerticalBorders = false, getRowId, itemType, size = 'default', }) => {
    const tableId = useId();
    const playerContext = usePlayer();
    // Filter out pinned columns by setting pinned to null
    const columnsWithoutPinning = useMemo(() => columns.map((col) => ({
        ...col,
        pinned: null,
    })), [columns]);
    // Parse columns (filters disabled and sorts by pinned position, but we've removed pinning)
    const parsedColumns = useMemo(() => parseTableColumns(columnsWithoutPinning), [columnsWithoutPinning]);
    // Create extractRowId function
    const extractRowId = useMemo(() => createExtractRowId(getRowId), [getRowId]);
    // Use item list state for selection
    const internalState = useItemListState(() => data, extractRowId);
    // Get default item controls
    const controls = useDefaultItemListControls();
    // Calculate row height based on size
    const DEFAULT_ROW_HEIGHT = useMemo(() => {
        switch (size) {
            case 'compact':
                return TableItemSize.COMPACT;
            case 'large':
                return TableItemSize.LARGE;
            case 'default':
            default:
                return TableItemSize.DEFAULT;
        }
    }, [size]);
    const tableItemProps = useMemo(() => ({
        cellPadding,
        columns: parsedColumns,
        controls,
        data: enableHeader ? [null, ...data] : data,
        enableAlternateRowColors,
        enableColumnReorder: false,
        enableColumnResize: false,
        enableDrag: false,
        enableExpansion: false,
        enableHeader,
        enableHorizontalBorders,
        enableRowHoverHighlight,
        enableSelection,
        enableVerticalBorders,
        getRowHeight: () => DEFAULT_ROW_HEIGHT,
        internalState,
        itemType,
        playerContext,
        size,
        tableId,
    }), [
        cellPadding,
        parsedColumns,
        controls,
        enableHeader,
        data,
        enableAlternateRowColors,
        enableHorizontalBorders,
        enableRowHoverHighlight,
        enableSelection,
        enableVerticalBorders,
        DEFAULT_ROW_HEIGHT,
        internalState,
        itemType,
        playerContext,
        size,
        tableId,
    ]);
    return (_jsx("div", { className: styles.simpleItemTableContainer, children: _jsxs(Table, { highlightOnHover: enableRowHoverHighlight, striped: enableAlternateRowColors, withColumnBorders: enableVerticalBorders, withRowBorders: enableHorizontalBorders, children: [enableHeader && (_jsx(Table.Thead, { children: _jsx(Table.Tr, { children: parsedColumns.map((column, columnIndex) => (_jsx(Table.Th, { style: {
                                textAlign: column.align === 'start'
                                    ? 'left'
                                    : column.align === 'end'
                                        ? 'right'
                                        : 'center',
                                width: column.width,
                            }, children: _jsx(TableColumnHeaderContainer, { ...tableItemProps, ariaAttributes: {
                                    'aria-colindex': columnIndex + 1,
                                    role: 'gridcell',
                                }, columnIndex: columnIndex, controls: controls, rowIndex: 0, style: { width: column.width }, type: column.id }) }, column.id))) }) })), _jsx(Table.Tbody, { children: data.map((item, rowIndex) => (_jsx(SimpleItemTableRow, { adjustedRowIndex: enableHeader ? rowIndex + 1 : rowIndex, enableAlternateRowColors: enableAlternateRowColors, enableHeader: enableHeader, enableHorizontalBorders: enableHorizontalBorders, enableRowHoverHighlight: enableRowHoverHighlight, enableVerticalBorders: enableVerticalBorders, internalState: internalState, isLastRow: rowIndex === data.length - 1, item: item, parsedColumns: parsedColumns, rowIndex: rowIndex, tableId: tableId, tableItemProps: tableItemProps }, internalState.extractRowId(item) || rowIndex))) })] }) }));
};
const SimpleItemTableRow = memo(({ adjustedRowIndex, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableVerticalBorders, internalState, isLastRow, item, parsedColumns, rowIndex, tableId, tableItemProps, }) => {
    const itemRowId = item && typeof item === 'object' && 'id' in item
        ? internalState.extractRowId(item)
        : undefined;
    const isSelected = useItemSelectionState(internalState, itemRowId || undefined);
    return (_jsx(Table.Tr, { className: clsx({
            [styles.alternateRowEven]: enableAlternateRowColors && rowIndex % 2 === 0,
            [styles.alternateRowOdd]: enableAlternateRowColors && rowIndex % 2 === 1,
            [styles.rowHover]: enableRowHoverHighlight,
            [styles.rowSelected]: isSelected,
            [styles.withHorizontalBorder]: enableHorizontalBorders && enableHeader && !isLastRow,
        }), "data-row-index": `${tableId}-${adjustedRowIndex}`, children: parsedColumns.map((column, columnIndex) => {
            const isLastColumn = columnIndex === parsedColumns.length - 1;
            return (_jsx(Table.Td, { className: clsx({
                    [styles.withVerticalBorder]: enableVerticalBorders && !isLastColumn,
                }), style: {
                    textAlign: column.align === 'start'
                        ? 'left'
                        : column.align === 'end'
                            ? 'right'
                            : 'center',
                    width: column.width,
                }, children: _jsx(ItemTableListColumn, { ...tableItemProps, ariaAttributes: {
                        'aria-colindex': columnIndex + 1,
                        role: 'gridcell',
                    }, columnIndex: columnIndex, rowIndex: adjustedRowIndex, style: { width: column.width } }) }, column.id));
        }) }));
});
SimpleItemTableRow.displayName = 'SimpleItemTableRow';

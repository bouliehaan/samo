import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { ItemTableListColumn } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
export const createColumnCellComponent = (columnType, itemType) => {
    return React.memo((props) => {
        return _jsx(ItemTableListColumn, { ...props, columnType: columnType, itemType: itemType });
    }, (prevProps, nextProps) => {
        return (prevProps.rowIndex === nextProps.rowIndex &&
            prevProps.columnIndex === nextProps.columnIndex &&
            prevProps.data === nextProps.data &&
            prevProps.style === nextProps.style &&
            prevProps.columns === nextProps.columns &&
            prevProps.playlistId === nextProps.playlistId);
    });
};
export const createColumnCellComponents = (columns, itemType) => {
    const componentMap = new Map();
    columns.forEach((columnType) => {
        componentMap.set(columnType, createColumnCellComponent(columnType, itemType));
    });
    return componentMap;
};

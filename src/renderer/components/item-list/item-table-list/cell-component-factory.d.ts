import React from 'react';
import { CellComponentProps } from 'react-window-v2';
import { TableItemProps } from '/@/renderer/components/item-list/item-table-list/item-table-list';
import { LibraryItem } from '/@/shared/types/domain-types';
import { TableColumn } from '/@/shared/types/types';
export declare const createColumnCellComponent: (columnType: TableColumn, itemType: LibraryItem) => React.ComponentType<CellComponentProps<TableItemProps>>;
export declare const createColumnCellComponents: (columns: TableColumn[], itemType: LibraryItem) => Map<TableColumn, React.ComponentType<CellComponentProps<TableItemProps>>>;

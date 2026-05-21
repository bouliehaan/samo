import React from 'react';
import { CellComponentProps } from 'react-window-v2';
import { TableItemProps } from './item-table-list';
import { LibraryItem } from '/@/shared/types/domain-types';
import { TableColumn } from '/@/shared/types/types';
interface MemoizedCellRouterProps extends CellComponentProps<TableItemProps> {
    columnCellComponents: Map<TableColumn, React.ComponentType<CellComponentProps<TableItemProps>>>;
}
export declare const MemoizedCellRouter: (props: MemoizedCellRouterProps) => import("react/jsx-runtime").JSX.Element;
export declare const useColumnCellComponents: (columns: TableColumn[], itemType: LibraryItem) => Map<TableColumn, React.ComponentType<CellComponentProps<TableItemProps>>>;
export {};

import React, { CSSProperties, ReactNode } from 'react';
import { CellComponentProps } from 'react-window-v2';
import { TableItemProps } from '/@/renderer/components/item-list/item-table-list/item-table-list';
import { ItemControls } from '/@/renderer/components/item-list/types';
import { TableColumn } from '/@/shared/types/types';
export interface ItemTableListColumn extends CellComponentProps<TableItemProps> {
    columnType?: TableColumn;
}
export interface ItemTableListInnerColumn extends ItemTableListColumn {
    controls: ItemControls;
    dragRef?: null | React.Ref<HTMLDivElement>;
    isDraggedOver?: 'bottom' | 'top' | null;
    isDragging?: boolean;
    type: TableColumn;
}
export declare const ItemTableListColumn: React.MemoExoticComponent<(props: ItemTableListColumn) => import("react/jsx-runtime").JSX.Element>;
export declare function isAlbumGroupingActive(columns: {
    id: string;
    isEnabled?: boolean;
}[]): boolean;
export declare function isLastInAlbumGroup(rowIndex: number, getRowItem: ((index: number) => unknown) | undefined, enableHeader: boolean | undefined, dataLength: number): boolean;
export declare const TableColumnTextContainer: (props: ItemTableListColumn & {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
    controls: ItemControls;
    dragRef?: null | React.Ref<HTMLDivElement>;
    isDraggedOver?: "bottom" | "top" | null;
    isDragging?: boolean;
    type: TableColumn;
}) => import("react/jsx-runtime").JSX.Element;
export declare const TableColumnContainer: (props: ItemTableListColumn & {
    children: React.ReactNode;
    className?: string;
    containerStyle?: CSSProperties;
    controls: ItemControls;
    dragRef?: null | React.Ref<HTMLDivElement>;
    isDraggedOver?: "bottom" | "top" | null;
    isDragging?: boolean;
    type: TableColumn;
}) => import("react/jsx-runtime").JSX.Element;
export declare const TableColumnHeaderContainer: (props: ItemTableListColumn & {
    className?: string;
    containerClassName?: string;
    controls: ItemControls;
    type: TableColumn;
}) => import("react/jsx-runtime").JSX.Element;
export declare const columnLabelMap: Record<TableColumn, ReactNode | string>;
export declare const ColumnNullFallback: (props: ItemTableListInnerColumn) => import("react/jsx-runtime").JSX.Element;
export declare const ColumnSkeletonVariable: (props: ItemTableListInnerColumn) => import("react/jsx-runtime").JSX.Element;
export declare const ColumnSkeletonFixed: (props: ItemTableListInnerColumn) => import("react/jsx-runtime").JSX.Element;

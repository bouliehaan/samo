import React, { type JSXElementConstructor, ReactElement, Ref } from 'react';
import { type CellComponentProps } from 'react-window-v2';
import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ItemControls, ItemListHandle, ItemTableListColumnConfig } from '/@/renderer/components/item-list/types';
import { PlayerContext } from '/@/renderer/features/player/context/player-context';
import { LibraryItem } from '/@/shared/types/domain-types';
import { TableColumn } from '/@/shared/types/types';
export declare enum TableItemSize {
    COMPACT = 40,
    DEFAULT = 64,
    LARGE = 88
}
export interface TableGroupHeader {
    itemCount: number;
    render: (props: {
        data: unknown[];
        groupIndex: number;
        index: number;
        internalState: ItemListStateActions;
        startDataIndex: number;
    }) => ReactElement;
}
export interface TableItemProps {
    adjustedRowIndexMap?: Map<number, number>;
    calculatedColumnWidths?: number[];
    cellPadding?: ItemTableListProps['cellPadding'];
    columns: ItemTableListColumnConfig[];
    controls: ItemControls;
    data: ItemTableListProps['data'];
    enableAlternateRowColors?: ItemTableListProps['enableAlternateRowColors'];
    enableColumnReorder?: boolean;
    enableColumnResize?: boolean;
    enableDrag?: ItemTableListProps['enableDrag'];
    enableDragScroll?: boolean;
    enableExpansion?: ItemTableListProps['enableExpansion'];
    enableHeader?: ItemTableListProps['enableHeader'];
    enableHorizontalBorders?: ItemTableListProps['enableHorizontalBorders'];
    enableRowHoverHighlight?: ItemTableListProps['enableRowHoverHighlight'];
    enableSelection?: ItemTableListProps['enableSelection'];
    enableVerticalBorders?: ItemTableListProps['enableVerticalBorders'];
    getAdjustedRowIndex?: (rowIndex: number) => number;
    getGroupRenderData?: () => unknown[];
    getRowHeight: (index: number, cellProps: TableItemProps) => number;
    getRowItem?: (rowIndex: number) => null | undefined | unknown;
    groupHeaderInfoByRowIndex?: Map<number, {
        groupIndex: number;
        startDataIndex: number;
    }>;
    groups?: TableGroupHeader[];
    hasAlbumGroupColumn?: boolean;
    internalState: ItemListStateActions;
    itemType: ItemTableListProps['itemType'];
    onRowClick?: (item: any, event: React.MouseEvent<HTMLDivElement>) => void;
    pinnedLeftColumnCount?: number;
    pinnedLeftColumnWidths?: number[];
    pinnedRightColumnCount?: number;
    pinnedRightColumnWidths?: number[];
    playerContext: PlayerContext;
    playlistId?: string;
    size?: ItemTableListProps['size'];
    startRowIndex?: number;
    tableId: string;
}
interface ItemTableListProps {
    activeRowId?: string;
    autoFitColumns?: boolean;
    CellComponent?: JSXElementConstructor<CellComponentProps<TableItemProps>>;
    cellPadding?: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    columns: ItemTableListColumnConfig[];
    data: unknown[];
    enableAlternateRowColors?: boolean;
    enableDrag?: boolean;
    enableDragScroll?: boolean;
    enableEntranceAnimation?: boolean;
    enableExpansion?: boolean;
    enableHeader?: boolean;
    enableHorizontalBorders?: boolean;
    enableRowHoverHighlight?: boolean;
    enableScrollShadow?: boolean;
    enableSelection?: boolean;
    enableSelectionDialog?: boolean;
    enableStickyGroupRows?: boolean;
    enableStickyHeader?: boolean;
    enableVerticalBorders?: boolean;
    getItem?: (index: number) => undefined | unknown;
    getItemIndex?: (rowId: string) => number | undefined;
    getRowId?: ((item: unknown) => string) | string;
    groups?: TableGroupHeader[];
    headerHeight?: number;
    initialTop?: {
        behavior?: 'auto' | 'smooth';
        to: number;
        type: 'index' | 'offset';
    };
    itemCount?: number;
    itemType: LibraryItem;
    onColumnReordered?: (columnIdFrom: TableColumn, columnIdTo: TableColumn, edge: 'bottom' | 'left' | 'right' | 'top' | null) => void;
    onColumnResized?: (columnId: TableColumn, width: number) => void;
    onRangeChanged?: (range: {
        startIndex: number;
        stopIndex: number;
    }) => void;
    onScrollEnd?: (offset: number, internalState: ItemListStateActions) => void;
    overrideControls?: Partial<ItemControls>;
    ref?: Ref<ItemListHandle>;
    rowHeight?: ((index: number, cellProps: TableItemProps) => number) | number;
    size?: 'compact' | 'default' | 'large';
    startRowIndex?: number;
}
export declare const ItemTableList: React.MemoExoticComponent<({ activeRowId, autoFitColumns, CellComponent, cellPadding, columns, data, enableAlternateRowColors, enableDrag, enableDragScroll, enableEntranceAnimation, enableExpansion, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableScrollShadow, enableSelection, enableStickyGroupRows, enableStickyHeader, enableVerticalBorders, getItem, getItemIndex, getRowId, groups, headerHeight, initialTop, itemCount, itemType, onColumnReordered, onColumnResized, onRangeChanged, onScrollEnd, overrideControls, ref, rowHeight, size, startRowIndex, }: ItemTableListProps) => import("react/jsx-runtime").JSX.Element>;
export {};

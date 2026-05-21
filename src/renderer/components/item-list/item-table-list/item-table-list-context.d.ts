import type { ReactElement } from 'react';
import React from 'react';
import type { TableItemProps } from './item-table-list';
import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ItemControls, ItemTableListColumnConfig } from '/@/renderer/components/item-list/types';
import { PlayerContext } from '/@/renderer/features/player/context/player-context';
import { LibraryItem } from '/@/shared/types/domain-types';
export type ItemTableListConfig = {
    cellPadding: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    columns: ItemTableListColumnConfig[];
    controls: ItemControls;
    enableAlternateRowColors: boolean;
    enableColumnReorder: boolean;
    enableColumnResize: boolean;
    enableDrag: boolean;
    enableExpansion: boolean;
    enableHeader: boolean;
    enableHorizontalBorders: boolean;
    enableRowHoverHighlight: boolean;
    enableSelection: boolean;
    enableVerticalBorders: boolean;
    getRowHeight: (index: number, cellProps: TableItemProps) => number;
    groups?: ItemTableListGroupHeader[];
    internalState: ItemListStateActions;
    itemType: LibraryItem;
    playerContext: PlayerContext;
    playlistId?: string;
    size: 'compact' | 'default' | 'large';
    startRowIndex?: number;
    tableId: string;
};
export type ItemTableListGroupHeader = {
    itemCount: number;
    render: (props: {
        data: unknown[];
        groupIndex: number;
        index: number;
        internalState: ItemListStateActions;
        startDataIndex: number;
    }) => ReactElement;
};
export declare const ItemTableListConfigProvider: ({ children, value, }: {
    children: React.ReactNode;
    value: ItemTableListConfig;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useItemTableListConfig: () => ItemTableListConfig | null;
export type ItemTableListColumnResizeLiveContextValue = {
    clearColumnResizePreview: () => void;
    scheduleColumnResizePreview: (columnIndex: number, width: number) => void;
};
export declare const ItemTableListColumnResizeLiveProvider: ({ children, value, }: {
    children: React.ReactNode;
    value: ItemTableListColumnResizeLiveContextValue;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useItemTableListColumnResizeLive: () => ItemTableListColumnResizeLiveContextValue | null;
export declare const useItemTableListColumnResizeLiveState: () => {
    clearColumnResizePreview: () => void;
    columnResizePreview: {
        columnIndex: number;
        width: number;
    } | null;
    scheduleColumnResizePreview: (columnIndex: number, width: number) => void;
};
type ItemTableListStoreContextValue = {
    activeRowStore: ActiveRowStore;
};
declare class ActiveRowStore {
    private activeRowId;
    private listeners;
    getActiveRowId(): null | string;
    setActiveRowId(next: null | string | undefined): void;
    subscribe(listener: () => void): () => void;
}
export declare const ItemTableListStoreProvider: ({ activeRowId, children, }: {
    activeRowId?: string;
    children: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useItemTableListStore: () => ItemTableListStoreContextValue | null;
export declare const useActiveRowSubscription: <T>(selector: (activeRowId: null | string) => T) => T;
export declare const useIsActiveRow: (...rowIds: Array<string | undefined>) => boolean;
export {};

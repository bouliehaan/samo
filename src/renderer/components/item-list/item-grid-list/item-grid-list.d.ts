import React, { Ref } from 'react';
import { ItemCardProps } from '/@/renderer/components/item-card/item-card';
import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ItemControls, ItemListHandle } from '/@/renderer/components/item-list/types';
import { LibraryItem } from '/@/shared/types/domain-types';
export interface GridItemProps {
    columns: number;
    controls: ItemCardProps['controls'];
    dataVersion?: number;
    enableDrag?: boolean;
    enableExpansion?: boolean;
    enableMultiSelect: boolean;
    enableSelection?: boolean;
    gap: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    getItem?: (index: number) => ItemCardProps['data'];
    internalState: ItemListStateActions;
    itemCount: number;
    itemType: LibraryItem;
    rows?: ItemCardProps['rows'];
    size?: 'compact' | 'default' | 'large';
    tableMeta: null | {
        columnCount: number;
        itemHeight: number;
        rowCount: number;
    };
}
export interface ItemGridListProps {
    currentPage?: number;
    data: unknown[];
    dataVersion?: number;
    enableDrag?: boolean;
    enableEntranceAnimation?: boolean;
    enableExpansion?: boolean;
    enableMultiSelect?: boolean;
    enableSelection?: boolean;
    enableSelectionDialog?: boolean;
    gap?: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    getItem?: (index: number) => ItemCardProps['data'];
    getItemIndex?: (rowId: string) => number | undefined;
    getRowId?: ((item: unknown) => string) | string;
    initialTop?: {
        to: number;
        type: 'index' | 'offset';
    };
    itemCount?: number;
    itemsPerRow?: number;
    itemType: LibraryItem;
    onRangeChanged?: (range: {
        startIndex: number;
        stopIndex: number;
    }) => void;
    onScroll?: (offset: number, direction: 'down' | 'up') => void;
    onScrollEnd?: (offset: number, direction: 'down' | 'up') => void;
    overrideControls?: Partial<ItemControls>;
    ref?: Ref<ItemListHandle>;
    rows?: ItemCardProps['rows'];
    size?: 'compact' | 'default' | 'large';
}
export declare const ItemGridList: React.MemoExoticComponent<({ currentPage, data, dataVersion, enableDrag, enableEntranceAnimation, enableExpansion, enableMultiSelect, enableSelection, gap, getItem, getItemIndex, getRowId, initialTop, itemCount, itemsPerRow, itemType, onRangeChanged, onScroll, onScrollEnd, overrideControls, ref, rows, size, }: ItemGridListProps) => import("react/jsx-runtime").JSX.Element>;

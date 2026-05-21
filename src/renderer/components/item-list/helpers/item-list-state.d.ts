import { LibraryItem } from '/@/shared/types/domain-types';
export type ItemListAction = {
    extractRowId: (item: unknown) => string | undefined;
    payload: ItemListStateItemWithRequiredProperties;
    type: 'TOGGLE_EXPANDED';
} | {
    extractRowId: (item: unknown) => string | undefined;
    payload: ItemListStateItemWithRequiredProperties;
    type: 'TOGGLE_SELECTED';
} | {
    extractRowId: (item: unknown) => string | undefined;
    payload: ItemListStateItemWithRequiredProperties[];
    type: 'SET_DRAGGING';
} | {
    extractRowId: (item: unknown) => string | undefined;
    payload: ItemListStateItemWithRequiredProperties[];
    type: 'SET_EXPANDED';
} | {
    extractRowId: (item: unknown) => string | undefined;
    payload: ItemListStateItemWithRequiredProperties[];
    type: 'SET_SELECTED';
} | {
    type: 'CLEAR_ALL';
} | {
    type: 'CLEAR_DRAGGING';
} | {
    type: 'CLEAR_EXPANDED';
} | {
    type: 'CLEAR_SELECTED';
};
export interface ItemListState {
    dragging: Set<string>;
    draggingItems: Map<string, unknown>;
    expanded: Set<string>;
    expandedItems: Map<string, unknown>;
    selected: Set<string>;
    selectedItems: Map<string, unknown>;
    version: number;
}
export interface ItemListStateActions {
    clearAll: () => void;
    clearDragging: () => void;
    clearExpanded: () => void;
    clearSelected: () => void;
    deselectAll: () => void;
    extractRowId: (item: unknown) => string | undefined;
    findItemIndex: (rowId: string) => number;
    getData: () => unknown[];
    getDragging: () => unknown[];
    getDraggingIds: () => string[];
    getExpanded: () => unknown[];
    getExpandedIds: () => string[];
    getExpandedItemsCached: () => unknown[];
    getSelected: () => unknown[];
    getSelectedIds: () => string[];
    getVersion: () => number;
    hasDragging: () => boolean;
    hasExpanded: () => boolean;
    hasSelected: () => boolean;
    isAllSelected: () => boolean;
    isDragging: (rowId: string) => boolean;
    isExpanded: (rowId: string) => boolean;
    isSelected: (rowId: string) => boolean;
    isSomeSelected: () => boolean;
    selectAll: () => void;
    setDragging: (items: ItemListStateItemWithRequiredProperties[]) => void;
    setExpanded: (items: ItemListStateItemWithRequiredProperties[]) => void;
    setSelected: (items: ItemListStateItemWithRequiredProperties[]) => void;
    toggleExpanded: (item: ItemListStateItemWithRequiredProperties) => void;
    toggleSelected: (item: ItemListStateItemWithRequiredProperties) => void;
}
export interface ItemListStateItem {
    _itemType: LibraryItem;
    _serverId: string;
    id: string;
    imageId: null | string;
}
export type ItemListStateItemWithRequiredProperties = Record<string, unknown> & {
    _itemType: LibraryItem;
    _serverId: string;
    id: string;
};
/**
 * Reusable reducer for item grid state management
 * Can be used in different components or contexts
 */
export declare const itemListReducer: (state: ItemListState, action: ItemListAction) => ItemListState;
export declare const initialItemListState: ItemListState;
/**
 * Hook to subscribe to specific state changes in the item list state
 * Use this in components that need to rerender when state changes
 */
export declare const useItemListStateSubscription: <T>(internalState: ItemListStateActions | undefined, selector: (state: ItemListState | null) => T) => T;
/**
 * Hook to subscribe to selection state for a specific item
 * Use this in components that need to rerender when a specific item's selection changes
 */
export declare const useItemSelectionState: (internalState: ItemListStateActions | undefined, rowId: string | undefined) => boolean;
/**
 * Hook to subscribe to expansion state for a specific item
 * Use this in components that need to rerender when a specific item's expansion changes
 */
export declare const useItemExpansionState: (internalState: ItemListStateActions | undefined, rowId: string | undefined) => boolean;
/**
 * Hook to subscribe to dragging state for a specific item
 * Use this in components that need to rerender when a specific item's dragging state changes
 */
export declare const useItemDraggingState: (internalState: ItemListStateActions | undefined, rowId: string | undefined) => boolean;
export declare const useItemListState: (getDataFn?: () => unknown[], extractRowId?: (item: unknown) => string | undefined) => ItemListStateActions;

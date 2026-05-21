import { ItemListAction, ItemListState, ItemListStateItemWithRequiredProperties } from './item-list-state';
/**
 * Action creators for item grid state management
 * These can be reused across different components and contexts
 */
export declare const itemListActions: {
    clearAll: () => ItemListAction;
    clearExpanded: () => ItemListAction;
    clearSelected: () => ItemListAction;
    setDragging: (items: ItemListStateItemWithRequiredProperties[], extractRowId: (item: unknown) => string | undefined) => ItemListAction;
    setExpanded: (items: ItemListStateItemWithRequiredProperties[], extractRowId: (item: unknown) => string | undefined) => ItemListAction;
    setSelected: (items: ItemListStateItemWithRequiredProperties[], extractRowId: (item: unknown) => string | undefined) => ItemListAction;
    toggleExpanded: (item: ItemListStateItemWithRequiredProperties, extractRowId: (item: unknown) => string | undefined) => ItemListAction;
    toggleSelected: (item: ItemListStateItemWithRequiredProperties, extractRowId: (item: unknown) => string | undefined) => ItemListAction;
};
/**
 * Selector functions for item grid state
 * These can be reused to extract specific data from state
 */
export declare const itemListSelectors: {
    getDragging: (state: ItemListState) => unknown[];
    getDraggingCount: (state: ItemListState) => number;
    getDraggingIds: (state: ItemListState) => string[];
    getExpanded: (state: ItemListState) => unknown[];
    getExpandedCount: (state: ItemListState) => number;
    getExpandedIds: (state: ItemListState) => string[];
    getSelected: (state: ItemListState) => unknown[];
    getSelectedCount: (state: ItemListState) => number;
    getSelectedIds: (state: ItemListState) => string[];
    getVersion: (state: ItemListState) => number;
    hasAnyDragging: (state: ItemListState) => boolean;
    hasAnyExpanded: (state: ItemListState) => boolean;
    hasAnySelected: (state: ItemListState) => boolean;
    isDragging: (state: ItemListState, rowId: string) => boolean;
    isExpanded: (state: ItemListState, rowId: string) => boolean;
    isSelected: (state: ItemListState, rowId: string) => boolean;
};
export declare const itemListUtils: {
    /**
     * Check if all items in a list are selected
     */
    areAllSelected: (state: ItemListState, rowIds: string[]) => boolean;
    /**
     * Check if any items in a list are selected
     */
    areAnySelected: (state: ItemListState, rowIds: string[]) => boolean;
    /**
     * Check if multiple items are expanded
     */
    isMultiExpand: (state: ItemListState) => boolean;
    /**
     * Check if multiple items are selected
     */
    isMultiSelect: (state: ItemListState) => boolean;
    /**
     * Toggle expansion of all items in a list
     */
    toggleAllExpanded: (items: ItemListStateItemWithRequiredProperties[], currentState: ItemListState, extractRowId: (item: unknown) => string | undefined) => ItemListAction;
    /**
     * Toggle selection of all items in a list
     */
    toggleAllSelected: (items: ItemListStateItemWithRequiredProperties[], currentState: ItemListState, extractRowId: (item: unknown) => string | undefined) => ItemListAction;
};

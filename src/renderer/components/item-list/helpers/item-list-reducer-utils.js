/**
 * Action creators for item grid state management
 * These can be reused across different components and contexts
 */
export const itemListActions = {
    clearAll: () => ({
        type: 'CLEAR_ALL',
    }),
    clearExpanded: () => ({
        type: 'CLEAR_EXPANDED',
    }),
    clearSelected: () => ({
        type: 'CLEAR_SELECTED',
    }),
    setDragging: (items, extractRowId) => ({
        extractRowId,
        payload: items,
        type: 'SET_DRAGGING',
    }),
    setExpanded: (items, extractRowId) => ({
        extractRowId,
        payload: items,
        type: 'SET_EXPANDED',
    }),
    setSelected: (items, extractRowId) => ({
        extractRowId,
        payload: items,
        type: 'SET_SELECTED',
    }),
    toggleExpanded: (item, extractRowId) => ({
        extractRowId,
        payload: item,
        type: 'TOGGLE_EXPANDED',
    }),
    toggleSelected: (item, extractRowId) => ({
        extractRowId,
        payload: item,
        type: 'TOGGLE_SELECTED',
    }),
};
/**
 * Selector functions for item grid state
 * These can be reused to extract specific data from state
 */
export const itemListSelectors = {
    getDragging: (state) => {
        return Array.from(state.draggingItems.values());
    },
    getDraggingCount: (state) => {
        return state.dragging.size;
    },
    getDraggingIds: (state) => {
        return Array.from(state.dragging);
    },
    getExpanded: (state) => {
        return Array.from(state.expandedItems.values());
    },
    getExpandedCount: (state) => {
        return state.expanded.size;
    },
    getExpandedIds: (state) => {
        return Array.from(state.expanded);
    },
    getSelected: (state) => {
        return Array.from(state.selectedItems.values());
    },
    getSelectedCount: (state) => {
        return state.selected.size;
    },
    getSelectedIds: (state) => {
        return Array.from(state.selected);
    },
    getVersion: (state) => {
        return state.version;
    },
    hasAnyDragging: (state) => {
        return state.dragging.size > 0;
    },
    hasAnyExpanded: (state) => {
        return state.expanded.size > 0;
    },
    hasAnySelected: (state) => {
        return state.selected.size > 0;
    },
    isDragging: (state, rowId) => {
        return state.dragging.has(rowId);
    },
    isExpanded: (state, rowId) => {
        return state.expanded.has(rowId);
    },
    isSelected: (state, rowId) => {
        return state.selected.has(rowId);
    },
};
export const itemListUtils = {
    /**
     * Check if all items in a list are selected
     */
    areAllSelected: (state, rowIds) => {
        return rowIds.every((id) => state.selected.has(id));
    },
    /**
     * Check if any items in a list are selected
     */
    areAnySelected: (state, rowIds) => {
        return rowIds.some((id) => state.selected.has(id));
    },
    /**
     * Check if multiple items are expanded
     */
    isMultiExpand: (state) => {
        return state.expanded.size > 1;
    },
    /**
     * Check if multiple items are selected
     */
    isMultiSelect: (state) => {
        return state.selected.size > 1;
    },
    /**
     * Toggle expansion of all items in a list
     */
    toggleAllExpanded: (items, currentState, extractRowId) => {
        const allExpanded = items.every((item) => {
            const rowId = extractRowId(item);
            return rowId ? currentState.expanded.has(rowId) : false;
        });
        return allExpanded
            ? itemListActions.clearExpanded()
            : itemListActions.setExpanded(items, extractRowId);
    },
    /**
     * Toggle selection of all items in a list
     */
    toggleAllSelected: (items, currentState, extractRowId) => {
        const allSelected = items.every((item) => {
            const rowId = extractRowId(item);
            return rowId ? currentState.selected.has(rowId) : false;
        });
        return allSelected
            ? itemListActions.clearSelected()
            : itemListActions.setSelected(items, extractRowId);
    },
};

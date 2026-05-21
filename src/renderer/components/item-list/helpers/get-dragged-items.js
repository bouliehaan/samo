/**
 * Type guard to assert that an item has the required properties for dragging
 */
const hasRequiredDragProperties = (item) => {
    return (typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof item.id === 'string' &&
        '_itemType' in item &&
        typeof item._itemType === 'string' &&
        '_serverId' in item &&
        typeof item._serverId === 'string');
};
/**
 * Gets the items that should be dragged based on the current data and selection state.
 * If the current item is already selected, drag all selected items.
 * Otherwise, select and drag only the current item.
 * If internalState is not provided, returns the single item wrapped in an array.
 *
 * @param data - The item data to drag (Album, AlbumArtist, Artist, Folder, Playlist, or Song)
 * @param internalState - The item list state actions (optional)
 * @param updateSelection - Whether to update the selection state (default: true)
 * @returns Array of items that should be dragged (with original values, asserting id, itemType, and _serverId)
 */
export const getDraggedItems = (data, internalState, updateSelection = true) => {
    if (!data) {
        return [];
    }
    if (!hasRequiredDragProperties(data)) {
        return [];
    }
    const draggedItem = data;
    if (!internalState) {
        return [draggedItem];
    }
    const rowId = internalState.extractRowId(data);
    if (!rowId) {
        return [draggedItem];
    }
    const previouslySelected = internalState.getSelected();
    const isDraggingSelectedItem = previouslySelected.some((selected) => {
        if (hasRequiredDragProperties(selected)) {
            return internalState.extractRowId(selected) === rowId;
        }
        return false;
    });
    const draggedItems = [];
    if (isDraggingSelectedItem) {
        const selectedItems = previouslySelected.filter((item) => hasRequiredDragProperties(item));
        draggedItems.push(...selectedItems);
    }
    else {
        if (updateSelection) {
            internalState.setSelected([draggedItem]);
        }
        draggedItems.push(draggedItem);
    }
    return draggedItems;
};

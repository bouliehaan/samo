import { useCallback } from 'react';
/**
 * Hook to handle keyboard navigation (ArrowUp/ArrowDown) for table row selection and scrolling.
 */
export const useTableKeyboardNavigation = ({ calculateScrollTopForIndex, cellPadding, data, DEFAULT_ROW_HEIGHT, enableHeader, enableSelection, extractRowId, getItem, getItemIndex, getStateItem, hasRequiredStateItemProperties, internalState, itemCount, itemType, parsedColumns, pinnedRightColumnCount, pinnedRightColumnRef, playerContext, rowHeight, rowRef, scrollToTableIndex, size, tableId, }) => {
    const handleKeyDown = useCallback((e) => {
        if (!enableSelection)
            return;
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')
            return;
        e.preventDefault();
        e.stopPropagation();
        const selected = internalState.getSelected();
        const validSelected = selected.filter(hasRequiredStateItemProperties);
        let currentIndex = -1;
        const totalCount = itemCount ?? data.length;
        if (validSelected.length > 0) {
            const lastSelected = validSelected[validSelected.length - 1];
            const rowId = extractRowId(lastSelected);
            if (rowId) {
                currentIndex =
                    getItemIndex?.(rowId) ?? data.findIndex((d) => extractRowId(d) === rowId);
            }
        }
        let newIndex = 0;
        if (currentIndex !== -1) {
            newIndex =
                e.key === 'ArrowDown'
                    ? Math.min(currentIndex + 1, totalCount - 1)
                    : Math.max(currentIndex - 1, 0);
        }
        const newItem = getItem ? getItem(newIndex) : data[newIndex];
        if (!newItem)
            return;
        const newItemListItem = getStateItem(newItem);
        if (newItemListItem && extractRowId(newItemListItem)) {
            internalState.setSelected([newItemListItem]);
        }
        // Check if we need to scroll by determining if the item is at the edge of the viewport
        const gridIndex = enableHeader ? newIndex + 1 : newIndex;
        const mainContainer = rowRef.current?.childNodes[0];
        const pinnedRightContainer = pinnedRightColumnRef.current?.childNodes[0];
        // Use right pinned column scroll position if right-pinned columns exist
        const scrollContainer = pinnedRightColumnCount > 0 && pinnedRightContainer
            ? pinnedRightContainer
            : mainContainer;
        if (scrollContainer) {
            const viewportTop = scrollContainer.scrollTop;
            const viewportHeight = scrollContainer.clientHeight;
            const viewportBottom = viewportTop + viewportHeight;
            const rowTop = calculateScrollTopForIndex(gridIndex);
            const adjustedIndex = enableHeader ? Math.max(0, newIndex - 1) : newIndex;
            const mockCellProps = {
                cellPadding,
                columns: parsedColumns,
                controls: {},
                data: enableHeader ? [null] : [],
                enableAlternateRowColors: false,
                enableExpansion: false,
                enableHeader,
                enableHorizontalBorders: false,
                enableRowHoverHighlight: false,
                enableSelection,
                enableVerticalBorders: false,
                getRowHeight: () => DEFAULT_ROW_HEIGHT,
                getRowItem: (rowIndex) => {
                    if (!getItem)
                        return undefined;
                    if (enableHeader && rowIndex === 0)
                        return null;
                    const dataIndex = enableHeader ? rowIndex - 1 : rowIndex;
                    return getItem(dataIndex);
                },
                internalState: {},
                itemType,
                playerContext,
                size,
                tableId,
            };
            let calculatedRowHeight;
            if (typeof rowHeight === 'number') {
                calculatedRowHeight = rowHeight;
            }
            else if (typeof rowHeight === 'function') {
                calculatedRowHeight = rowHeight(adjustedIndex, mockCellProps);
            }
            else {
                calculatedRowHeight = DEFAULT_ROW_HEIGHT;
            }
            const rowBottom = rowTop + calculatedRowHeight;
            // Check if row is fully visible within viewport
            const isFullyVisible = rowTop >= viewportTop && rowBottom <= viewportBottom;
            // Check if row is at the edge (top or bottom of viewport)
            const isAtTopEdge = rowTop < viewportTop;
            const isAtBottomEdge = rowBottom >= viewportBottom;
            // Only scroll if the item is not fully visible or at the edge
            if (!isFullyVisible || isAtTopEdge || isAtBottomEdge) {
                // Determine alignment based on direction
                const align = e.key === 'ArrowDown' && isAtBottomEdge
                    ? 'bottom'
                    : e.key === 'ArrowUp' && isAtTopEdge
                        ? 'top'
                        : isAtBottomEdge
                            ? 'bottom'
                            : isAtTopEdge
                                ? 'top'
                                : 'top';
                scrollToTableIndex(gridIndex, { align });
            }
        }
    }, [
        calculateScrollTopForIndex,
        cellPadding,
        data,
        getItem,
        getItemIndex,
        DEFAULT_ROW_HEIGHT,
        enableHeader,
        enableSelection,
        extractRowId,
        getStateItem,
        hasRequiredStateItemProperties,
        internalState,
        itemCount,
        itemType,
        parsedColumns,
        pinnedRightColumnCount,
        pinnedRightColumnRef,
        playerContext,
        rowHeight,
        rowRef,
        scrollToTableIndex,
        size,
        tableId,
    ]);
    return { handleKeyDown };
};

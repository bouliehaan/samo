import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import throttle from 'lodash/throttle';
import { motion } from 'motion/react';
import { useOverlayScrollbars } from 'overlayscrollbars-react';
import React, { memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, } from 'react-window';
import styles from './item-grid-list.module.css';
import { getDataRowsCount, ItemCard, } from '/@/renderer/components/item-card/item-card';
import { createExtractRowId } from '/@/renderer/components/item-list/helpers/extract-row-id';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useItemListState, } from '/@/renderer/components/item-list/helpers/item-list-state';
import { useListHotkeys } from '/@/renderer/components/item-list/helpers/use-list-hotkeys';
import { animationProps } from '/@/shared/components/animations/animation-props';
import { useElementSize } from '/@/shared/hooks/use-element-size';
import { useFocusWithin } from '/@/shared/hooks/use-focus-within';
import { useMergedRef } from '/@/shared/hooks/use-merged-ref';
const VirtualizedGridList = React.memo(({ controls, currentPage, dataVersion, enableDrag, enableExpansion, enableMultiSelect, enableSelection, gap, getItem, height, initialTop, internalState, itemCount, itemType, onRangeChanged, onScroll, onScrollEnd, outerRef, ref, rows, size, tableMetaRef, width, }) => {
    const tableMeta = tableMetaRef.current;
    const scrollEndTimeoutRef = useRef(null);
    const isInitialScrollRef = useRef(true);
    const initialScrollOffsetRef = useRef(null);
    const itemData = useMemo(() => {
        return {
            columns: tableMeta?.columnCount || 0,
            controls,
            dataVersion,
            enableDrag,
            enableExpansion,
            enableMultiSelect,
            enableSelection,
            gap,
            getItem,
            internalState,
            itemCount,
            itemType,
            rows,
            size,
            tableMeta,
        };
    }, [
        tableMeta,
        controls,
        rows,
        getItem,
        itemCount,
        dataVersion,
        enableDrag,
        enableExpansion,
        enableMultiSelect,
        enableSelection,
        gap,
        internalState,
        itemType,
        size,
    ]);
    const handleOnScroll = useCallback(({ scrollDirection, scrollOffset }) => {
        onScroll?.(scrollOffset, scrollDirection === 'forward' ? 'down' : 'up');
        if (isInitialScrollRef.current) {
            if (initialScrollOffsetRef.current === null) {
                initialScrollOffsetRef.current = scrollOffset;
                return;
            }
            else if (Math.abs(initialScrollOffsetRef.current - scrollOffset) < 1) {
                return;
            }
            isInitialScrollRef.current = false;
        }
        if (scrollEndTimeoutRef.current) {
            clearTimeout(scrollEndTimeoutRef.current);
        }
        scrollEndTimeoutRef.current = setTimeout(() => {
            onScrollEnd?.(scrollOffset, scrollDirection === 'forward' ? 'down' : 'up');
            scrollEndTimeoutRef.current = null;
        }, 150);
    }, [onScroll, onScrollEnd]);
    useEffect(() => {
        return () => {
            if (scrollEndTimeoutRef.current) {
                clearTimeout(scrollEndTimeoutRef.current);
            }
        };
    }, []);
    const handleOnItemsRendered = useCallback((items) => {
        const columnCount = tableMetaRef.current?.columnCount || 0;
        onRangeChanged?.({
            startIndex: items.visibleStartIndex * columnCount,
            stopIndex: items.visibleStopIndex * columnCount,
        });
    }, [onRangeChanged, tableMetaRef]);
    useEffect(() => {
        isInitialScrollRef.current = true;
        initialScrollOffsetRef.current = null;
    }, [initialTop]);
    if (!tableMeta) {
        return null;
    }
    const calculateInitialScrollOffset = () => {
        // When page changes, always start at top (ignore initialTop)
        if (currentPage !== undefined) {
            if (currentPage === 0 && initialTop) {
                if (initialTop.type === 'offset') {
                    return initialTop.to;
                }
                const columnCount = tableMeta?.columnCount || 1;
                const itemHeight = tableMeta?.itemHeight || 0;
                const rowIndex = Math.floor(initialTop.to / columnCount);
                return rowIndex * itemHeight;
            }
            return 0;
        }
        if (!initialTop)
            return 0;
        if (initialTop.type === 'offset') {
            return initialTop.to;
        }
        const columnCount = tableMeta?.columnCount || 1;
        const itemHeight = tableMeta?.itemHeight || 0;
        const rowIndex = Math.floor(initialTop.to / columnCount);
        return rowIndex * itemHeight;
    };
    return (_jsx(FixedSizeList, { height: height, initialScrollOffset: calculateInitialScrollOffset(), itemCount: tableMeta.rowCount || 0, itemData: itemData, itemSize: tableMeta.itemHeight || 0, onItemsRendered: handleOnItemsRendered, onScroll: handleOnScroll, outerRef: outerRef, ref: ref, width: width, children: ListComponent }));
});
VirtualizedGridList.displayName = 'VirtualizedGridList';
const createThrottledSetTableMeta = (itemsPerRow, rowsCount, size) => {
    return throttle((width, dataLength, setTableMeta) => {
        const isSm = width >= 600;
        const isMd = width >= 768;
        const isLg = width >= 960;
        const isXl = width >= 1200;
        const is2xl = width >= 1440;
        const is3xl = width >= 1920;
        const is4xl = width >= 2560;
        let dynamicItemsPerRow = 2;
        if (is4xl) {
            dynamicItemsPerRow = 10;
        }
        else if (is3xl) {
            dynamicItemsPerRow = 8;
        }
        else if (is2xl) {
            dynamicItemsPerRow = 7;
        }
        else if (isXl) {
            dynamicItemsPerRow = 6;
        }
        else if (isLg) {
            dynamicItemsPerRow = 5;
        }
        else if (isMd) {
            dynamicItemsPerRow = 4;
        }
        else if (isSm) {
            dynamicItemsPerRow = 3;
        }
        else {
            dynamicItemsPerRow = 2;
        }
        if (size === 'large') {
            dynamicItemsPerRow = Math.round(dynamicItemsPerRow * 0.75);
            if (dynamicItemsPerRow < 1) {
                dynamicItemsPerRow = 1;
            }
        }
        const setItemsPerRow = itemsPerRow || dynamicItemsPerRow;
        const widthPerItem = Number(width) / setItemsPerRow;
        // For compact size, don't include text lines in height calculation
        // CompactItemCard has a different layout that doesn't need the extra space
        const itemHeight = size === 'compact'
            ? widthPerItem
            : widthPerItem + (rowsCount || getDataRowsCount()) * 26;
        if (widthPerItem === 0) {
            return;
        }
        setTableMeta({
            columnCount: setItemsPerRow,
            itemHeight,
            rowCount: Math.ceil(dataLength / setItemsPerRow),
        });
    }, 200);
};
const BaseItemGridList = ({ currentPage, data, dataVersion, enableDrag = true, enableEntranceAnimation = true, enableExpansion = false, enableMultiSelect = false, enableSelection = true, gap = 'sm', getItem, getItemIndex, getRowId, initialTop, itemCount, itemsPerRow, itemType, onRangeChanged, onScroll, onScrollEnd, overrideControls, ref, rows, size = 'default', }) => {
    const rootRef = useRef(null);
    const outerRef = useRef(null);
    const listRef = useRef(null);
    const { ref: containerRef, width: containerWidth } = useElementSize();
    const { focused, ref: containerFocusRef } = useFocusWithin();
    const handleRef = useRef(null);
    const mergedContainerRef = useMergedRef(containerRef, rootRef, containerFocusRef);
    const resolvedItemCount = itemCount ?? data.length;
    const resolvedGetItem = useCallback((index) => {
        return (getItem ? getItem(index) : data[index]);
    }, [data, getItem]);
    const getDataFn = useCallback(() => {
        return data;
    }, [data]);
    const extractRowId = useMemo(() => createExtractRowId(getRowId), [getRowId]);
    const internalState = useItemListState(getDataFn, extractRowId);
    const [initialize, osInstance] = useOverlayScrollbars({
        defer: false,
        events: {
            initialized(osInstance) {
                const { viewport } = osInstance.elements();
                viewport.style.overflowX = `var(--os-viewport-overflow-x)`;
                viewport.style.overflowY = `var(--os-viewport-overflow-y)`;
            },
        },
        options: {
            overflow: { x: 'hidden', y: 'scroll' },
            paddingAbsolute: true,
            scrollbars: {
                autoHide: 'leave',
                autoHideDelay: 500,
                pointers: ['mouse', 'pen', 'touch'],
                theme: 'samo-os-scrollbar',
            },
        },
    });
    const tableMetaRef = useRef(null);
    const [tableMetaVersion, setTableMetaVersion] = useState(0);
    const isOverlayScrollbarsInitialized = useRef(false);
    useEffect(() => {
        const { current: root } = rootRef;
        const { current: outer } = outerRef;
        if (!tableMetaRef.current || !root || !outer || isOverlayScrollbarsInitialized.current) {
            return;
        }
        initialize({
            elements: {
                viewport: outer,
            },
            target: root,
        });
        isOverlayScrollbarsInitialized.current = true;
    }, [initialize, tableMetaVersion]);
    useEffect(() => {
        return () => {
            try {
                const instance = osInstance();
                const { current: root } = rootRef;
                const { current: outer } = outerRef;
                // Check if instance exists and elements are still connected to the DOM
                if (instance) {
                    // Check if elements are still in the document
                    const rootInDocument = root && document.contains(root);
                    const outerInDocument = outer && document.contains(outer);
                    // Only destroy if elements are still in the document
                    if (rootInDocument && outerInDocument) {
                        instance.destroy();
                    }
                }
            }
            catch {
                // Ignore error
            }
        };
    }, [osInstance]);
    const throttledSetTableMeta = useMemo(() => {
        return createThrottledSetTableMeta(itemsPerRow, rows?.length, size);
    }, [itemsPerRow, rows?.length, size]);
    useLayoutEffect(() => {
        const { current: container } = containerRef;
        if (!container)
            return;
        throttledSetTableMeta(containerWidth, resolvedItemCount, (meta) => {
            if (!meta)
                return;
            const current = tableMetaRef.current;
            if (!current ||
                current.columnCount !== meta.columnCount ||
                current.itemHeight !== meta.itemHeight ||
                current.rowCount !== meta.rowCount) {
                tableMetaRef.current = meta;
                container.style.setProperty('--grid-column-count', String(meta.columnCount));
                container.style.setProperty('--grid-item-height', `${meta.itemHeight}px`);
                container.style.setProperty('--grid-row-count', String(meta.rowCount));
                setTableMetaVersion((v) => v + 1);
            }
        });
    }, [containerWidth, resolvedItemCount, throttledSetTableMeta, containerRef]);
    const controls = useDefaultItemListControls({
        enableMultiSelect,
        overrides: overrideControls,
    });
    const scrollToIndex = useCallback((index, options) => {
        if (!listRef.current || !tableMetaRef.current)
            return;
        const row = Math.floor(index / tableMetaRef.current.columnCount);
        // Map alignment options to react-window's alignment
        let alignment = 'smart';
        if (options?.align === 'top') {
            alignment = 'start';
        }
        else if (options?.align === 'center') {
            alignment = 'center';
        }
        else if (options?.align === 'bottom') {
            alignment = 'end';
        }
        listRef.current.scrollToItem(row, alignment);
    }, []);
    const scrollToOffset = useCallback((offset) => {
        if (!listRef.current)
            return;
        listRef.current.scrollTo(offset);
    }, []);
    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!enableSelection || !tableMetaRef.current)
            return;
        if (e.key !== 'ArrowDown' &&
            e.key !== 'ArrowUp' &&
            e.key !== 'ArrowLeft' &&
            e.key !== 'ArrowRight')
            return;
        e.preventDefault();
        e.stopPropagation();
        const selected = internalState.getSelected();
        let currentIndex = -1;
        if (selected.length > 0) {
            const lastSelected = selected[selected.length - 1];
            const lastRowId = internalState.extractRowId(lastSelected);
            if (lastRowId) {
                currentIndex =
                    getItemIndex?.(lastRowId) ??
                        data.findIndex((d) => {
                            const rowId = internalState.extractRowId(d);
                            return rowId === lastRowId;
                        });
            }
        }
        // Calculate grid position
        const currentRow = currentIndex !== -1
            ? Math.floor(currentIndex / tableMetaRef.current.columnCount)
            : 0;
        const currentCol = currentIndex !== -1 ? currentIndex % tableMetaRef.current.columnCount : 0;
        const totalRows = Math.ceil(resolvedItemCount / tableMetaRef.current.columnCount);
        let newIndex = 0;
        if (currentIndex !== -1) {
            switch (e.key) {
                case 'ArrowDown': {
                    // Move down one row
                    const nextRow = currentRow + 1;
                    if (nextRow < totalRows) {
                        const nextRowStart = nextRow * tableMetaRef.current.columnCount;
                        const nextRowEnd = Math.min(nextRowStart + tableMetaRef.current.columnCount - 1, resolvedItemCount - 1);
                        // Keep same column position, or use last item in row if column doesn't exist
                        newIndex = Math.min(nextRowStart + currentCol, nextRowEnd);
                    }
                    else {
                        newIndex = currentIndex;
                    }
                    break;
                }
                case 'ArrowLeft': {
                    // Move left, wrap to previous row if at start of row
                    if (currentCol > 0) {
                        newIndex = currentIndex - 1;
                    }
                    else if (currentRow > 0) {
                        // Wrap to end of previous row
                        newIndex = Math.max((currentRow - 1) * tableMetaRef.current.columnCount +
                            tableMetaRef.current.columnCount -
                            1, 0);
                        newIndex = Math.min(newIndex, resolvedItemCount - 1);
                    }
                    else {
                        newIndex = currentIndex;
                    }
                    break;
                }
                case 'ArrowRight': {
                    // Move right, wrap to next row if at end of row
                    if (currentCol < tableMetaRef.current.columnCount - 1 &&
                        currentIndex < resolvedItemCount - 1) {
                        newIndex = currentIndex + 1;
                    }
                    else if (currentRow < totalRows - 1) {
                        // Wrap to start of next row
                        newIndex = Math.min((currentRow + 1) * tableMetaRef.current.columnCount, resolvedItemCount - 1);
                    }
                    else {
                        newIndex = currentIndex;
                    }
                    break;
                }
                case 'ArrowUp': {
                    // Move up one row
                    const prevRow = currentRow - 1;
                    if (prevRow >= 0) {
                        const prevRowStart = prevRow * tableMetaRef.current.columnCount;
                        const prevRowEnd = Math.min(prevRowStart + tableMetaRef.current.columnCount - 1, resolvedItemCount - 1);
                        // Keep same column position, or use last item in row if column doesn't exist
                        newIndex = Math.min(prevRowStart + currentCol, prevRowEnd);
                    }
                    else {
                        newIndex = currentIndex;
                    }
                    break;
                }
            }
        }
        else {
            // No selection, start at first item
            newIndex = 0;
        }
        const newItem = resolvedGetItem(newIndex);
        if (!newItem)
            return;
        // Handle Shift + Arrow for incremental range selection (matches shift+click behavior)
        if (e.shiftKey) {
            const selectedItems = internalState.getSelected();
            const lastSelectedItem = selectedItems[selectedItems.length - 1];
            if (lastSelectedItem) {
                // Find the indices of the last selected item and new item
                const lastRowId = internalState.extractRowId(lastSelectedItem);
                if (!lastRowId)
                    return;
                const lastIndex = getItemIndex?.(lastRowId) ??
                    data.findIndex((d) => {
                        const rowId = internalState.extractRowId(d);
                        return rowId === lastRowId;
                    });
                if (lastIndex !== -1 && newIndex !== -1) {
                    // Create range selection from last selected to new position
                    const startIndex = Math.min(lastIndex, newIndex);
                    const stopIndex = Math.max(lastIndex, newIndex);
                    const rangeItems = [];
                    for (let i = startIndex; i <= stopIndex; i++) {
                        const rangeItem = resolvedGetItem(i);
                        if (rangeItem &&
                            typeof rangeItem === 'object' &&
                            '_serverId' in rangeItem &&
                            'itemType' in rangeItem &&
                            internalState.extractRowId(rangeItem)) {
                            rangeItems.push(rangeItem);
                        }
                    }
                    // Add range items to selection (matching shift+click behavior)
                    const currentSelected = internalState.getSelected();
                    const newSelected = [
                        ...currentSelected.filter((item) => typeof item === 'object' && item !== null),
                    ];
                    rangeItems.forEach((rangeItem) => {
                        const rangeRowId = internalState.extractRowId(rangeItem);
                        if (rangeRowId &&
                            !newSelected.some((selected) => internalState.extractRowId(selected) === rangeRowId)) {
                            newSelected.push(rangeItem);
                        }
                    });
                    // Ensure the last item in selection is the item at newIndex for incremental extension
                    const newItemListItem = newItem;
                    const newItemRowId = internalState.extractRowId(newItemListItem);
                    if (newItemRowId) {
                        // Remove the new item from its current position if it exists
                        const filteredSelected = newSelected.filter((item) => internalState.extractRowId(item) !== newItemRowId);
                        // Add it at the end so it becomes the last selected item
                        filteredSelected.push(newItemListItem);
                        internalState.setSelected(filteredSelected);
                    }
                }
            }
            else {
                // No previous selection, just select the new item
                const newItemListItem = newItem;
                if (internalState.extractRowId(newItemListItem)) {
                    internalState.setSelected([newItemListItem]);
                }
            }
        }
        else {
            // Without Shift: select only the new item
            const newItemListItem = newItem;
            if (internalState.extractRowId(newItemListItem)) {
                internalState.setSelected([newItemListItem]);
            }
        }
        scrollToIndex(newIndex);
    }, [
        data,
        enableSelection,
        getItemIndex,
        internalState,
        resolvedGetItem,
        resolvedItemCount,
        scrollToIndex,
    ]);
    const imperativeHandle = useMemo(() => {
        return {
            internalState,
            scrollToIndex: (index, options) => {
                scrollToIndex(index, options);
            },
            scrollToOffset: (offset) => {
                scrollToOffset(offset);
            },
        };
    }, [internalState, scrollToIndex, scrollToOffset]);
    useEffect(() => {
        handleRef.current = imperativeHandle;
    }, [imperativeHandle]);
    useImperativeHandle(ref, () => imperativeHandle, [imperativeHandle]);
    useListHotkeys({
        controls,
        focused,
        internalState,
        itemType,
    });
    return (_jsx(motion.div, { className: styles.itemGridContainer, "data-overlayscrollbars-initialize": "", onKeyDown: handleKeyDown, onMouseDown: (e) => e.currentTarget.focus(), ref: mergedContainerRef, tabIndex: 0, ...animationProps.fadeIn, transition: { duration: enableEntranceAnimation ? 0.5 : 0, ease: 'anticipate' }, children: _jsx(AutoSizer, { children: ({ height, width }) => (_jsx(VirtualizedGridList, { _tableMetaVersion: tableMetaVersion, controls: controls, currentPage: currentPage, dataVersion: dataVersion, enableDrag: enableDrag, enableExpansion: enableExpansion, enableMultiSelect: enableMultiSelect, enableSelection: enableSelection, gap: gap, getItem: resolvedGetItem, height: height, initialTop: initialTop, internalState: internalState, itemCount: resolvedItemCount, itemType: itemType, onRangeChanged: onRangeChanged, onScroll: onScroll ?? (() => { }), onScrollEnd: onScrollEnd ?? (() => { }), outerRef: outerRef, ref: listRef, rows: rows, size: size, tableMetaRef: tableMetaRef, width: width })) }) }));
};
const ListComponent = memo((props) => {
    const { index, style } = props;
    const { columns, controls, enableDrag, enableMultiSelect, gap, getItem, itemCount, itemType, rows, size, } = props.data;
    const items = [];
    const startIndex = index * columns;
    const stopIndex = Math.min(itemCount - 1, startIndex + columns - 1);
    const columnCountInRow = stopIndex - startIndex + 1;
    let columnCountToAdd = 0;
    if (columnCountInRow !== columns) {
        columnCountToAdd = columns - columnCountInRow;
    }
    for (let i = startIndex; i <= stopIndex + columnCountToAdd; i += 1) {
        if (i < itemCount) {
            const item = getItem ? getItem(i) : undefined;
            items.push(_jsx("div", { className: clsx(styles.itemRow, styles[`gap-${gap}`]), style: { '--columns': columns }, children: _jsx(ItemCard, { controls: controls, data: item, enableDrag: enableDrag, enableExpansion: props.data.enableExpansion, enableMultiSelect: enableMultiSelect, imageAsLink: !enableMultiSelect, internalState: props.data.internalState, itemType: itemType, rows: rows, type: size === 'compact' ? 'compact' : 'poster', withControls: true }) }, `card-${i}-${index}`));
        }
        else {
            items.push(null);
        }
    }
    return (_jsx("div", { className: styles.itemList, style: style, children: items }));
});
export const ItemGridList = memo(BaseItemGridList);
ItemGridList.displayName = 'ItemGridList';

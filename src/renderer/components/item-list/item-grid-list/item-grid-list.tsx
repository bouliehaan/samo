import clsx from 'clsx';
import throttle from 'lodash/throttle';
import { motion } from 'motion/react';
import { useOverlayScrollbars } from 'overlayscrollbars-react';
import React, {
    CSSProperties,
    memo,
    ReactElement,
    ReactNode,
    Ref,
    RefObject,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List, ListImperativeAPI, RowComponentProps } from 'react-window-v2';

import {
    type GridScrollDirection,
    itemRangeForRows,
    resolveInitialScrollOffset,
    resolveScrollDirection,
    rowForIndex,
} from './item-grid-list-scroll';
import styles from './item-grid-list.module.css';

import {
    getDataRowsCount,
    ItemCard,
    ItemCardProps,
} from '/@/renderer/components/item-card/item-card';
import { createExtractRowId } from '/@/renderer/components/item-list/helpers/extract-row-id';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import {
    ItemListStateActions,
    ItemListStateItemWithRequiredProperties,
    useItemListState,
} from '/@/renderer/components/item-list/helpers/item-list-state';
import { useListHotkeys } from '/@/renderer/components/item-list/helpers/use-list-hotkeys';
import { ItemControls, ItemListHandle } from '/@/renderer/components/item-list/types';
import { animationProps } from '/@/shared/components/animations/animation-props';
import { useElementSize } from '/@/shared/hooks/use-element-size';
import { useFocusWithin } from '/@/shared/hooks/use-focus-within';
import { useMergedRef } from '/@/shared/hooks/use-merged-ref';
import { LibraryItem } from '/@/shared/types/domain-types';

interface VirtualizedGridListProps {
    _tableMetaVersion: number; // Used to trigger rerenders via React.memo comparison
    controls: ItemControls;
    currentPage?: number;
    dataVersion?: number;
    enableDrag?: boolean;
    enableExpansion: boolean;
    enableMultiSelect: boolean;
    enableSelection: boolean;
    gap: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    getItem?: (index: number) => ItemCardProps['data'];
    height: number;
    initialTop?: ItemGridListProps['initialTop'];
    internalState: ItemListStateActions;
    itemCount: number;
    itemType: LibraryItem;
    listRef: RefObject<ListImperativeAPI | null>;
    onRangeChanged?: ItemGridListProps['onRangeChanged'];
    onScroll?: ItemGridListProps['onScroll'];
    onScrollEnd?: ItemGridListProps['onScrollEnd'];
    rows?: ItemCardProps['rows'];
    size?: 'compact' | 'default' | 'large';
    tableMetaRef: RefObject<null | {
        columnCount: number;
        itemHeight: number;
        rowCount: number;
    }>;
    width: number;
}

const VirtualizedGridList = React.memo(
    ({
        _tableMetaVersion,
        controls,
        currentPage,
        dataVersion,
        enableDrag,
        enableExpansion,
        enableMultiSelect,
        enableSelection,
        gap,
        getItem,
        height,
        initialTop,
        internalState,
        itemCount,
        itemType,
        listRef,
        onRangeChanged,
        onScroll,
        onScrollEnd,
        rows,
        size,
        tableMetaRef,
        width,
    }: VirtualizedGridListProps) => {
        const tableMeta = tableMetaRef.current;
        const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const isInitialScrollRef = useRef(true);
        const initialScrollOffsetRef = useRef<null | number>(null);

        const itemData: GridItemProps = useMemo(() => {
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

        // react-window v2 has no `onScroll` prop and no `scrollDirection` — the
        // list is driven through its own DOM element, which is what
        // `listRef.current.element` returns. Direction is derived from
        // successive offsets by `resolveScrollDirection`.
        const lastScrollOffsetRef = useRef(0);
        const lastScrollDirectionRef = useRef<GridScrollDirection>('down');

        useEffect(() => {
            const element = listRef.current?.element;
            if (!element) {
                return;
            }

            const handleScroll = () => {
                const scrollOffset = element.scrollTop;
                const scrollDirection = resolveScrollDirection(
                    lastScrollOffsetRef.current,
                    scrollOffset,
                    lastScrollDirectionRef.current,
                );
                lastScrollOffsetRef.current = scrollOffset;
                lastScrollDirectionRef.current = scrollDirection;

                onScroll?.(scrollOffset, scrollDirection);

                // Swallow the restore itself. Applying a saved offset fires a
                // scroll event, and without this the list would immediately
                // report a "scroll end" at the restored position and persist it
                // back — harmless, but it also fired onScrollEnd for a scroll
                // the user never performed.
                if (isInitialScrollRef.current) {
                    if (initialScrollOffsetRef.current === null) {
                        initialScrollOffsetRef.current = scrollOffset;
                        return;
                    } else if (Math.abs(initialScrollOffsetRef.current - scrollOffset) < 1) {
                        return;
                    }
                    isInitialScrollRef.current = false;
                }

                if (scrollEndTimeoutRef.current) {
                    clearTimeout(scrollEndTimeoutRef.current);
                }

                scrollEndTimeoutRef.current = setTimeout(() => {
                    onScrollEnd?.(scrollOffset, scrollDirection);
                    scrollEndTimeoutRef.current = null;
                }, 150);
            };

            element.addEventListener('scroll', handleScroll, { passive: true });
            return () => {
                element.removeEventListener('scroll', handleScroll);
            };
            // `_tableMetaVersion` is in the deps because the list only mounts
            // once tableMeta exists — before that there is no element to bind to.
        }, [listRef, onScroll, onScrollEnd, _tableMetaVersion]);

        useEffect(() => {
            return () => {
                if (scrollEndTimeoutRef.current) {
                    clearTimeout(scrollEndTimeoutRef.current);
                }
            };
        }, []);

        const handleRowsRendered = useCallback(
            (visibleRows: { startIndex: number; stopIndex: number }) => {
                onRangeChanged?.(
                    itemRangeForRows(
                        visibleRows,
                        tableMetaRef.current?.columnCount || 0,
                        itemCount,
                    ),
                );
            },
            [onRangeChanged, tableMetaRef, itemCount],
        );

        useEffect(() => {
            isInitialScrollRef.current = true;
            initialScrollOffsetRef.current = null;
        }, [initialTop]);

        // v1 took `initialScrollOffset` as a prop; v2 has no equivalent, so the
        // saved position is applied straight to the scroll container. This runs
        // in a layout effect so the restore happens before paint — as an effect
        // the user would see the top of the list for a frame, then a jump.
        const restoredForRef = useRef<GridInitialTopKey | null>(null);
        const restoreKey: GridInitialTopKey = initialTop
            ? `${initialTop.type}:${initialTop.to}:${currentPage ?? ''}`
            : null;

        useLayoutEffect(() => {
            const element = listRef.current?.element;
            if (!element || !tableMeta || restoredForRef.current === restoreKey) {
                return;
            }

            restoredForRef.current = restoreKey;

            const offset = resolveInitialScrollOffset({
                columnCount: tableMeta.columnCount,
                currentPage,
                initialTop,
                itemHeight: tableMeta.itemHeight,
            });

            element.scrollTo({ behavior: 'auto', top: offset });
            lastScrollOffsetRef.current = offset;
        }, [listRef, tableMeta, restoreKey, currentPage, initialTop]);

        if (!tableMeta) {
            return null;
        }

        return (
            <List
                listRef={listRef}
                onRowsRendered={handleRowsRendered}
                rowComponent={
                    RowComponent as (props: RowComponentProps<GridItemProps>) => ReactElement
                }
                rowCount={tableMeta.rowCount || 0}
                // A number today. v2 also accepts `(index, rowProps) => number`
                // and the `useDynamicRowHeight` hook here, which is the path to
                // variable-height rows — v1 could not do either.
                rowHeight={tableMeta.itemHeight || 0}
                rowProps={itemData}
                style={{ height, width }}
            />
        );
    },
);

type GridInitialTopKey = null | string;

VirtualizedGridList.displayName = 'VirtualizedGridList';

const createThrottledSetTableMeta = (
    itemsPerRow?: number,
    rowsCount?: number,
    size?: 'compact' | 'default' | 'large',
) => {
    return throttle((width: number, dataLength: number, setTableMeta: (meta: any) => void) => {
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
        } else if (is3xl) {
            dynamicItemsPerRow = 8;
        } else if (is2xl) {
            dynamicItemsPerRow = 7;
        } else if (isXl) {
            dynamicItemsPerRow = 6;
        } else if (isLg) {
            dynamicItemsPerRow = 5;
        } else if (isMd) {
            dynamicItemsPerRow = 4;
        } else if (isSm) {
            dynamicItemsPerRow = 3;
        } else {
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
        const itemHeight =
            size === 'compact'
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
    onRangeChanged?: (range: { startIndex: number; stopIndex: number }) => void;
    onScroll?: (offset: number, direction: 'down' | 'up') => void;
    onScrollEnd?: (offset: number, direction: 'down' | 'up') => void;
    overrideControls?: Partial<ItemControls>;
    ref?: Ref<ItemListHandle>;
    rows?: ItemCardProps['rows'];
    size?: 'compact' | 'default' | 'large';
}

const BaseItemGridList = ({
    currentPage,
    data,
    dataVersion,
    enableDrag = true,
    enableEntranceAnimation = true,
    enableExpansion = false,
    enableMultiSelect = false,
    enableSelection = true,
    gap = 'sm',
    getItem,
    getItemIndex,
    getRowId,
    initialTop,
    itemCount,
    itemsPerRow,
    itemType,
    onRangeChanged,
    onScroll,
    onScrollEnd,
    overrideControls,
    ref,
    rows,
    size = 'default',
}: ItemGridListProps) => {
    const rootRef = useRef(null);
    const listRef = useRef<ListImperativeAPI | null>(null);
    const { ref: containerRef, width: containerWidth } = useElementSize();
    const { focused, ref: containerFocusRef } = useFocusWithin();
    const handleRef = useRef<ItemListHandle | null>(null);
    const mergedContainerRef = useMergedRef(containerRef, rootRef, containerFocusRef);

    const resolvedItemCount = itemCount ?? data.length;
    const resolvedGetItem = useCallback<(index: number) => ItemCardProps['data']>(
        (index: number) => {
            return (getItem ? getItem(index) : (data as any[])[index]) as ItemCardProps['data'];
        },
        [data, getItem],
    );

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

    const tableMetaRef = useRef<null | {
        columnCount: number;
        itemHeight: number;
        rowCount: number;
    }>(null);

    const [tableMetaVersion, setTableMetaVersion] = useState(0);
    const isOverlayScrollbarsInitialized = useRef(false);
    const viewportRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const { current: root } = rootRef;
        // Under v1 this was react-window's `outerRef`. v2 exposes the same
        // element — its root IS the scroll container (`overflow: auto`) — via
        // the imperative API instead of a ref prop.
        const viewport = listRef.current?.element;

        if (!tableMetaRef.current || !root || !viewport || isOverlayScrollbarsInitialized.current) {
            return;
        }

        initialize({
            elements: {
                viewport,
            },
            target: root,
        });

        // Held separately because the unmount cleanup below still needs this
        // element to decide whether destroying is safe, and by then React has
        // already cleared `listRef`.
        viewportRef.current = viewport;
        isOverlayScrollbarsInitialized.current = true;
    }, [initialize, tableMetaVersion]);

    useEffect(() => {
        return () => {
            try {
                const instance = osInstance();
                const { current: root } = rootRef;
                const { current: outer } = viewportRef;

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
            } catch {
                // Ignore error
            }
        };
    }, [osInstance]);

    const throttledSetTableMeta = useMemo(() => {
        return createThrottledSetTableMeta(itemsPerRow, rows?.length, size);
    }, [itemsPerRow, rows?.length, size]);

    useLayoutEffect(() => {
        const { current: container } = containerRef;
        if (!container) return;

        throttledSetTableMeta(containerWidth, resolvedItemCount, (meta) => {
            if (!meta) return;

            const current = tableMetaRef.current;
            if (
                !current ||
                current.columnCount !== meta.columnCount ||
                current.itemHeight !== meta.itemHeight ||
                current.rowCount !== meta.rowCount
            ) {
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

    const scrollToIndex = useCallback(
        (
            index: number,
            options?: { align?: 'bottom' | 'center' | 'top'; behavior?: 'auto' | 'smooth' },
        ) => {
            if (!listRef.current || !tableMetaRef.current) return;
            const row = rowForIndex(index, tableMetaRef.current.columnCount);

            // Map alignment options to react-window's alignment
            let alignment: 'auto' | 'center' | 'end' | 'smart' | 'start' = 'smart';
            if (options?.align === 'top') {
                alignment = 'start';
            } else if (options?.align === 'center') {
                alignment = 'center';
            } else if (options?.align === 'bottom') {
                alignment = 'end';
            }

            listRef.current.scrollToRow({
                align: alignment,
                behavior: options?.behavior,
                index: row,
            });
        },
        [],
    );

    // v1 had `scrollTo(offset)`; v2's imperative API is row-based only, so a raw
    // pixel offset goes straight to the scroll container.
    const scrollToOffset = useCallback(
        (offset: number, options?: { behavior?: 'auto' | 'smooth' }) => {
            const element = listRef.current?.element;
            if (!element) return;
            element.scrollTo({ behavior: options?.behavior ?? 'auto', top: offset });
        },
        [],
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (!enableSelection || !tableMetaRef.current) return;
            if (
                e.key !== 'ArrowDown' &&
                e.key !== 'ArrowUp' &&
                e.key !== 'ArrowLeft' &&
                e.key !== 'ArrowRight'
            )
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
                        data.findIndex((d: any) => {
                            const rowId = internalState.extractRowId(d);
                            return rowId === lastRowId;
                        });
                }
            }

            // Calculate grid position
            const currentRow =
                currentIndex !== -1
                    ? Math.floor(currentIndex / tableMetaRef.current.columnCount)
                    : 0;
            const currentCol =
                currentIndex !== -1 ? currentIndex % tableMetaRef.current.columnCount : 0;
            const totalRows = Math.ceil(resolvedItemCount / tableMetaRef.current.columnCount);

            let newIndex = 0;
            if (currentIndex !== -1) {
                switch (e.key) {
                    case 'ArrowDown': {
                        // Move down one row
                        const nextRow = currentRow + 1;
                        if (nextRow < totalRows) {
                            const nextRowStart = nextRow * tableMetaRef.current.columnCount;
                            const nextRowEnd = Math.min(
                                nextRowStart + tableMetaRef.current.columnCount - 1,
                                resolvedItemCount - 1,
                            );
                            // Keep same column position, or use last item in row if column doesn't exist
                            newIndex = Math.min(nextRowStart + currentCol, nextRowEnd);
                        } else {
                            newIndex = currentIndex;
                        }
                        break;
                    }
                    case 'ArrowLeft': {
                        // Move left, wrap to previous row if at start of row
                        if (currentCol > 0) {
                            newIndex = currentIndex - 1;
                        } else if (currentRow > 0) {
                            // Wrap to end of previous row
                            newIndex = Math.max(
                                (currentRow - 1) * tableMetaRef.current.columnCount +
                                    tableMetaRef.current.columnCount -
                                    1,
                                0,
                            );
                            newIndex = Math.min(newIndex, resolvedItemCount - 1);
                        } else {
                            newIndex = currentIndex;
                        }
                        break;
                    }
                    case 'ArrowRight': {
                        // Move right, wrap to next row if at end of row
                        if (
                            currentCol < tableMetaRef.current.columnCount - 1 &&
                            currentIndex < resolvedItemCount - 1
                        ) {
                            newIndex = currentIndex + 1;
                        } else if (currentRow < totalRows - 1) {
                            // Wrap to start of next row
                            newIndex = Math.min(
                                (currentRow + 1) * tableMetaRef.current.columnCount,
                                resolvedItemCount - 1,
                            );
                        } else {
                            newIndex = currentIndex;
                        }
                        break;
                    }
                    case 'ArrowUp': {
                        // Move up one row
                        const prevRow = currentRow - 1;
                        if (prevRow >= 0) {
                            const prevRowStart = prevRow * tableMetaRef.current.columnCount;
                            const prevRowEnd = Math.min(
                                prevRowStart + tableMetaRef.current.columnCount - 1,
                                resolvedItemCount - 1,
                            );
                            // Keep same column position, or use last item in row if column doesn't exist
                            newIndex = Math.min(prevRowStart + currentCol, prevRowEnd);
                        } else {
                            newIndex = currentIndex;
                        }
                        break;
                    }
                }
            } else {
                // No selection, start at first item
                newIndex = 0;
            }

            const newItem: any = resolvedGetItem(newIndex);
            if (!newItem) return;

            // Handle Shift + Arrow for incremental range selection (matches shift+click behavior)
            if (e.shiftKey) {
                const selectedItems = internalState.getSelected();
                const lastSelectedItem = selectedItems[selectedItems.length - 1];

                if (lastSelectedItem) {
                    // Find the indices of the last selected item and new item
                    const lastRowId = internalState.extractRowId(lastSelectedItem);
                    if (!lastRowId) return;

                    const lastIndex =
                        getItemIndex?.(lastRowId) ??
                        data.findIndex((d: any) => {
                            const rowId = internalState.extractRowId(d);
                            return rowId === lastRowId;
                        });

                    if (lastIndex !== -1 && newIndex !== -1) {
                        // Create range selection from last selected to new position
                        const startIndex = Math.min(lastIndex, newIndex);
                        const stopIndex = Math.max(lastIndex, newIndex);

                        const rangeItems: ItemListStateItemWithRequiredProperties[] = [];
                        for (let i = startIndex; i <= stopIndex; i++) {
                            const rangeItem = resolvedGetItem(i);
                            if (
                                rangeItem &&
                                typeof rangeItem === 'object' &&
                                '_serverId' in rangeItem &&
                                'itemType' in rangeItem &&
                                internalState.extractRowId(rangeItem)
                            ) {
                                rangeItems.push(
                                    rangeItem as unknown as ItemListStateItemWithRequiredProperties,
                                );
                            }
                        }

                        // Add range items to selection (matching shift+click behavior)
                        const currentSelected = internalState.getSelected();
                        const newSelected: ItemListStateItemWithRequiredProperties[] = [
                            ...currentSelected.filter(
                                (item): item is ItemListStateItemWithRequiredProperties =>
                                    typeof item === 'object' && item !== null,
                            ),
                        ];
                        rangeItems.forEach((rangeItem) => {
                            const rangeRowId = internalState.extractRowId(rangeItem);
                            if (
                                rangeRowId &&
                                !newSelected.some(
                                    (selected) =>
                                        internalState.extractRowId(selected) === rangeRowId,
                                )
                            ) {
                                newSelected.push(rangeItem);
                            }
                        });

                        // Ensure the last item in selection is the item at newIndex for incremental extension
                        const newItemListItem = newItem as ItemListStateItemWithRequiredProperties;
                        const newItemRowId = internalState.extractRowId(newItemListItem);
                        if (newItemRowId) {
                            // Remove the new item from its current position if it exists
                            const filteredSelected = newSelected.filter(
                                (item) => internalState.extractRowId(item) !== newItemRowId,
                            );
                            // Add it at the end so it becomes the last selected item
                            filteredSelected.push(newItemListItem);
                            internalState.setSelected(filteredSelected);
                        }
                    }
                } else {
                    // No previous selection, just select the new item
                    const newItemListItem = newItem as ItemListStateItemWithRequiredProperties;
                    if (internalState.extractRowId(newItemListItem)) {
                        internalState.setSelected([newItemListItem]);
                    }
                }
            } else {
                // Without Shift: select only the new item
                const newItemListItem = newItem as ItemListStateItemWithRequiredProperties;
                if (internalState.extractRowId(newItemListItem)) {
                    internalState.setSelected([newItemListItem]);
                }
            }

            scrollToIndex(newIndex);
        },
        [
            data,
            enableSelection,
            getItemIndex,
            internalState,
            resolvedGetItem,
            resolvedItemCount,
            scrollToIndex,
        ],
    );

    const imperativeHandle: ItemListHandle = useMemo(() => {
        return {
            internalState,
            scrollToIndex: (index: number, options?: { align?: 'bottom' | 'center' | 'top' }) => {
                scrollToIndex(index, options);
            },
            scrollToOffset: (offset: number) => {
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

    return (
        <motion.div
            className={styles.itemGridContainer}
            data-overlayscrollbars-initialize=""
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => (e.currentTarget as HTMLDivElement).focus()}
            ref={mergedContainerRef}
            tabIndex={0}
            {...animationProps.fadeIn}
            transition={{ duration: enableEntranceAnimation ? 0.5 : 0, ease: 'anticipate' }}
        >
            <AutoSizer>
                {({ height, width }) => (
                    <VirtualizedGridList
                        _tableMetaVersion={tableMetaVersion}
                        controls={controls}
                        currentPage={currentPage}
                        dataVersion={dataVersion}
                        enableDrag={enableDrag}
                        enableExpansion={enableExpansion}
                        enableMultiSelect={enableMultiSelect}
                        enableSelection={enableSelection}
                        gap={gap}
                        getItem={resolvedGetItem}
                        height={height}
                        initialTop={initialTop}
                        internalState={internalState}
                        itemCount={resolvedItemCount}
                        itemType={itemType}
                        listRef={listRef}
                        onRangeChanged={onRangeChanged}
                        onScroll={onScroll ?? (() => {})}
                        onScrollEnd={onScrollEnd ?? (() => {})}
                        rows={rows}
                        size={size}
                        tableMetaRef={tableMetaRef}
                        width={width}
                    />
                )}
            </AutoSizer>
        </motion.div>
    );
};

// v2 spreads `rowProps` directly onto the row component alongside `index` and
// `style`, where v1 nested everything under a single `data` prop.
const RowComponent = memo((props: RowComponentProps<GridItemProps>) => {
    const {
        columns,
        controls,
        enableDrag,
        enableMultiSelect,
        gap,
        getItem,
        index,
        itemCount,
        itemType,
        rows,
        size,
        style,
    } = props;

    const items: ReactNode[] = [];
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
            items.push(
                <div
                    className={clsx(styles.itemRow, styles[`gap-${gap}`])}
                    key={`card-${i}-${index}`}
                    style={{ '--columns': columns } as CSSProperties}
                >
                    <ItemCard
                        controls={controls}
                        data={item}
                        enableDrag={enableDrag}
                        enableExpansion={props.enableExpansion}
                        enableMultiSelect={enableMultiSelect}
                        imageAsLink={!enableMultiSelect}
                        internalState={props.internalState}
                        itemType={itemType}
                        rows={rows}
                        type={size === 'compact' ? 'compact' : 'poster'}
                        withControls
                    />
                </div>,
            );
        } else {
            items.push(null);
        }
    }

    return (
        <div className={styles.itemList} style={style}>
            {items}
        </div>
    );
});

export const ItemGridList = memo(BaseItemGridList);

ItemGridList.displayName = 'ItemGridList';

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { attachClosestEdge, extractClosestEdge, } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements, } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import clsx from 'clsx';
import { memo, useEffect, useRef, useState, } from 'react';
import styles from './item-table-list-column.module.css';
import i18n from '/@/i18n/i18n';
import { useItemSelectionState } from '/@/renderer/components/item-list/helpers/item-list-state';
import { isNoHorizontalPaddingColumn } from '/@/renderer/components/item-list/item-detail-list/utils';
import { ActionsColumn } from '/@/renderer/components/item-list/item-table-list/columns/actions-column';
import { AlbumArtistsColumn } from '/@/renderer/components/item-list/item-table-list/columns/album-artists-column';
import { AlbumColumn } from '/@/renderer/components/item-list/item-table-list/columns/album-column';
import { AlbumGroupColumn } from '/@/renderer/components/item-list/item-table-list/columns/album-group-column';
import { ArtistsColumn } from '/@/renderer/components/item-list/item-table-list/columns/artists-column';
import { ComposerColumn } from '/@/renderer/components/item-list/item-table-list/columns/composer-column';
import { CountColumn } from '/@/renderer/components/item-list/item-table-list/columns/count-column';
import { AbsoluteDateColumn, DateColumn, RelativeDateColumn, } from '/@/renderer/components/item-list/item-table-list/columns/date-column';
import { DefaultColumn } from '/@/renderer/components/item-list/item-table-list/columns/default-column';
import { DurationColumn } from '/@/renderer/components/item-list/item-table-list/columns/duration-column';
import { FavoriteColumn } from '/@/renderer/components/item-list/item-table-list/columns/favorite-column';
import { GenreBadgeColumn } from '/@/renderer/components/item-list/item-table-list/columns/genre-badge-column';
import { GenreColumn } from '/@/renderer/components/item-list/item-table-list/columns/genre-column';
import { ImageColumn } from '/@/renderer/components/item-list/item-table-list/columns/image-column';
import { NumericColumn } from '/@/renderer/components/item-list/item-table-list/columns/numeric-column';
import { PathColumn } from '/@/renderer/components/item-list/item-table-list/columns/path-column';
import { PlaylistReorderColumn } from '/@/renderer/components/item-list/item-table-list/columns/playlist-reorder-column';
import { RatingColumn } from '/@/renderer/components/item-list/item-table-list/columns/rating-column';
import { RowIndexColumn } from '/@/renderer/components/item-list/item-table-list/columns/row-index-column';
import { SizeColumn } from '/@/renderer/components/item-list/item-table-list/columns/size-column';
import { TextColumn } from '/@/renderer/components/item-list/item-table-list/columns/text-column';
import { TitleArtistColumn } from '/@/renderer/components/item-list/item-table-list/columns/title-artist-column';
import { TitleColumn } from '/@/renderer/components/item-list/item-table-list/columns/title-column';
import { TitleCombinedColumn } from '/@/renderer/components/item-list/item-table-list/columns/title-combined-column';
import { YearColumn } from '/@/renderer/components/item-list/item-table-list/columns/year-column';
import { useItemDragDropState } from '/@/renderer/components/item-list/item-table-list/hooks/use-item-drag-drop-state';
import { useItemTableListColumnResizeLive } from '/@/renderer/components/item-list/item-table-list/item-table-list-context';
import { Flex } from '/@/shared/components/flex/flex';
import { Icon } from '/@/shared/components/icon/icon';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';
import { Text } from '/@/shared/components/text/text';
import { useDoubleClick } from '/@/shared/hooks/use-double-click';
import { useMergedRef } from '/@/shared/hooks/use-merged-ref';
import { LibraryItem } from '/@/shared/types/domain-types';
import { dndUtils, DragOperation, DragTarget } from '/@/shared/types/drag-and-drop';
import { TableColumn } from '/@/shared/types/types';
const ItemTableListColumnBase = (props) => {
    const type = props.columnType ?? props.columns[props.columnIndex].id;
    const isHeaderEnabled = !!props.enableHeader;
    const isDataRow = isHeaderEnabled ? props.rowIndex > 0 : true;
    const item = isDataRow
        ? (props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex])
        : null;
    const shouldEnableDrag = !!props.enableDrag && isDataRow && !!item;
    const itemType = item?._itemType || props.itemType;
    // Check if this row should render a group header (must be before conditional returns)
    // Group headers need to be rendered consistently across all grids (pinned left, main, pinned right)
    // to maintain proper styling and row heights
    let groupHeader = null;
    if (props.groups && isDataRow && props.groups.length > 0) {
        const groupInfo = props.groupHeaderInfoByRowIndex?.get(props.rowIndex);
        const group = groupInfo ? props.groups[groupInfo.groupIndex] : undefined;
        if (groupInfo && group) {
            // Determine where to render the group header content:
            // - If pinned left columns exist, render in the first pinned left column
            // - Otherwise, render in the first column of the main grid
            const hasPinnedLeftColumns = (props.pinnedLeftColumnCount || 0) > 0;
            const isFirstPinnedLeftColumn = props.columnIndex === 0 && hasPinnedLeftColumns;
            const isMainGridFirstColumn = !hasPinnedLeftColumns &&
                (props.columnIndex === (props.pinnedLeftColumnCount || 0) ||
                    (props.columnIndex === 0 && (props.pinnedLeftColumnCount || 0) === 0));
            // Render group header content in the first pinned left column (if exists) or first main grid column
            if (isFirstPinnedLeftColumn || isMainGridFirstColumn) {
                groupHeader = group.render({
                    data: props.getGroupRenderData?.() ?? [],
                    groupIndex: groupInfo.groupIndex,
                    index: props.rowIndex,
                    internalState: props.internalState,
                    startDataIndex: groupInfo.startDataIndex,
                });
            }
            else {
                // For other columns, mark as group header row for styled rendering
                groupHeader = 'GROUP_HEADER';
            }
        }
    }
    const { dragRef, isDraggedOver, isDragging } = useItemDragDropState({
        enableDrag: !!props.enableDrag,
        internalState: props.internalState,
        isDataRow,
        item,
        itemType: props.itemType,
        playerContext: props.playerContext,
        playlistId: props.playlistId,
    });
    const controls = props.controls;
    const dragProps = {
        dragRef: shouldEnableDrag ? dragRef : null,
        isDraggedOver: isDraggedOver === 'top' || isDraggedOver === 'bottom' ? isDraggedOver : null,
        isDragging,
    };
    if (isHeaderEnabled && props.rowIndex === 0) {
        return _jsx(TableColumnHeaderContainer, { ...props, controls: controls, type: type });
    }
    // Render group header if this row should have one
    if (groupHeader) {
        if (groupHeader === 'GROUP_HEADER') {
            // For non-first columns (pinned left, other main columns, pinned right),
            // render a styled cell that matches the group header styling
            // This ensures consistent row heights and styling across all grids
            return _jsx("div", { style: { ...props.style } });
        }
        // Render the group header spanning full table width
        // If rendering in pinned left column, extend right to cover all columns
        // If rendering in main grid, extend left to cover pinned columns
        const pinnedLeftWidth = props.pinnedLeftColumnWidths?.reduce((sum, width) => sum + width, 0) || 0;
        // Determine if we're rendering in the first pinned left column
        const isFirstPinnedLeftColumn = props.columnIndex === 0 && (props.pinnedLeftColumnCount || 0) > 0;
        if (isFirstPinnedLeftColumn) {
            return (_jsx("div", { style: {
                    ...props.style,
                    marginLeft: 0,
                    marginRight: 0,
                }, children: groupHeader }));
        }
        // For main grid, use negative margin to extend left
        return (_jsx("div", { style: {
                ...props.style,
                marginLeft: pinnedLeftWidth > 0 ? `-${pinnedLeftWidth}px` : 0,
            }, children: groupHeader }));
    }
    if (type === TableColumn.LAYOUT_FILL) {
        return (_jsx(TableColumnContainer, { ...props, ...dragProps, controls: controls, type: type, children: null }));
    }
    if (itemType !== LibraryItem.FOLDER) {
        switch (type) {
            case TableColumn.ACTIONS:
            case TableColumn.SKIP:
                return _jsx(ActionsColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.ALBUM:
                return _jsx(AlbumColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.ALBUM_ARTIST:
                return (_jsx(AlbumArtistsColumn, { ...props, ...dragProps, controls: controls, type: type }));
            case TableColumn.ALBUM_COUNT:
            case TableColumn.PLAY_COUNT:
            case TableColumn.SONG_COUNT:
                return _jsx(CountColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.ALBUM_GROUP:
                return (_jsx(AlbumGroupColumn, { ...props, ...dragProps, controls: controls, type: type }));
            case TableColumn.ARTIST:
                return _jsx(ArtistsColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.BIOGRAPHY:
            case TableColumn.COMMENT:
                return _jsx(TextColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.BIT_DEPTH:
            case TableColumn.BIT_RATE:
            case TableColumn.BPM:
            case TableColumn.CHANNELS:
            case TableColumn.DISC_NUMBER:
            case TableColumn.SAMPLE_RATE:
            case TableColumn.TRACK_NUMBER:
                return _jsx(NumericColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.COMPOSER:
                return _jsx(ComposerColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.DATE_ADDED:
                return _jsx(DateColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.DURATION:
                return _jsx(DurationColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.GENRE:
                return _jsx(GenreColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.GENRE_BADGE:
                return (_jsx(GenreBadgeColumn, { ...props, ...dragProps, controls: controls, type: type }));
            case TableColumn.IMAGE:
                return _jsx(ImageColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.LAST_PLAYED:
                return (_jsx(RelativeDateColumn, { ...props, ...dragProps, controls: controls, type: type }));
            case TableColumn.PATH:
                return _jsx(PathColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.PLAYLIST_REORDER:
                return _jsx(PlaylistReorderColumn, { ...props, controls: controls, type: type });
            case TableColumn.RELEASE_DATE:
                return (_jsx(AbsoluteDateColumn, { ...props, ...dragProps, controls: controls, type: type }));
            case TableColumn.ROW_INDEX:
                return _jsx(RowIndexColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.SIZE:
                return _jsx(SizeColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.TITLE:
                return _jsx(TitleColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.TITLE_ARTIST:
                return (_jsx(TitleArtistColumn, { ...props, ...dragProps, controls: controls, type: type }));
            case TableColumn.TITLE_COMBINED:
                return (_jsx(TitleCombinedColumn, { ...props, ...dragProps, controls: controls, type: type }));
            case TableColumn.USER_FAVORITE:
                return _jsx(FavoriteColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.USER_RATING:
                return _jsx(RatingColumn, { ...props, ...dragProps, controls: controls, type: type });
            case TableColumn.YEAR:
                return _jsx(YearColumn, { ...props, ...dragProps, controls: controls, type: type });
            default:
                return _jsx(DefaultColumn, { ...props, ...dragProps, controls: controls, type: type });
        }
    }
    switch (type) {
        case TableColumn.ACTIONS:
            return _jsx(ActionsColumn, { ...props, ...dragProps, controls: controls, type: type });
        case TableColumn.IMAGE:
            return _jsx(ImageColumn, { ...props, ...dragProps, controls: controls, type: type });
        case TableColumn.ROW_INDEX:
            return _jsx(RowIndexColumn, { ...props, ...dragProps, controls: controls, type: type });
        case TableColumn.TITLE:
            return _jsx(TitleColumn, { ...props, ...dragProps, controls: controls, type: type });
        case TableColumn.TITLE_ARTIST:
            return _jsx(TitleArtistColumn, { ...props, ...dragProps, controls: controls, type: type });
        case TableColumn.TITLE_COMBINED:
            return (_jsx(TitleCombinedColumn, { ...props, ...dragProps, controls: controls, type: type }));
        default:
            return _jsx(ColumnNullFallback, { ...props, ...dragProps, controls: controls, type: type });
    }
};
export const ItemTableListColumn = memo(ItemTableListColumnBase, (prevProps, nextProps) => {
    const prevItem = prevProps.getRowItem?.(prevProps.rowIndex);
    const nextItem = nextProps.getRowItem?.(nextProps.rowIndex);
    return (prevProps.rowIndex === nextProps.rowIndex &&
        prevProps.columnIndex === nextProps.columnIndex &&
        prevProps.data === nextProps.data &&
        prevProps.columns === nextProps.columns &&
        prevProps.style === nextProps.style &&
        prevProps.columnType === nextProps.columnType &&
        prevProps.itemType === nextProps.itemType &&
        prevProps.enableHeader === nextProps.enableHeader &&
        prevProps.enableDrag === nextProps.enableDrag &&
        prevProps.groups === nextProps.groups &&
        prevProps.groupHeaderInfoByRowIndex === nextProps.groupHeaderInfoByRowIndex &&
        prevProps.pinnedLeftColumnCount === nextProps.pinnedLeftColumnCount &&
        prevProps.pinnedLeftColumnWidths === nextProps.pinnedLeftColumnWidths &&
        prevProps.size === nextProps.size &&
        prevProps.enableAlternateRowColors === nextProps.enableAlternateRowColors &&
        prevProps.enableHorizontalBorders === nextProps.enableHorizontalBorders &&
        prevProps.enableVerticalBorders === nextProps.enableVerticalBorders &&
        prevProps.enableRowHoverHighlight === nextProps.enableRowHoverHighlight &&
        prevProps.enableSelection === nextProps.enableSelection &&
        prevProps.enableColumnResize === nextProps.enableColumnResize &&
        prevProps.enableColumnReorder === nextProps.enableColumnReorder &&
        prevProps.cellPadding === nextProps.cellPadding &&
        prevProps.playlistId === nextProps.playlistId &&
        prevItem === nextItem);
});
const NonMutedColumns = [TableColumn.TITLE, TableColumn.TITLE_ARTIST, TableColumn.TITLE_COMBINED];
export function isAlbumGroupingActive(columns) {
    return columns.some((col) => col.id === TableColumn.ALBUM_GROUP && col.isEnabled);
}
export function isLastInAlbumGroup(rowIndex, getRowItem, enableHeader, dataLength) {
    const item = getRowItem?.(rowIndex);
    if (!item?.album)
        return true;
    const nextRowIndex = rowIndex + 1;
    const maxRow = enableHeader ? dataLength + 1 : dataLength;
    if (nextRowIndex >= maxRow)
        return true;
    const nextItem = getRowItem?.(nextRowIndex);
    return !nextItem || nextItem.album !== item.album;
}
export const TableColumnTextContainer = (props) => {
    const containerRef = useRef(null);
    const isDataRow = props.enableHeader ? props.rowIndex > 0 : true;
    const dataIndex = props.enableHeader ? props.rowIndex - 1 : props.rowIndex;
    const item = isDataRow
        ? (props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex])
        : null;
    const itemRowId = item && typeof item === 'object' && 'id' in item
        ? props.internalState.extractRowId(item)
        : undefined;
    const isSelected = useItemSelectionState(props.internalState, itemRowId || undefined);
    const isDragging = props.isDragging ?? false;
    const mergedRef = useMergedRef(containerRef, props.dragRef ?? null);
    const isLastColumn = props.columnIndex === props.columns.length - 1;
    const isLastRow = isDataRow &&
        (props.enableHeader
            ? props.rowIndex === props.data.length
            : props.rowIndex === props.data.length - 1);
    // Apply dragged over state to all cells in the row so border can span entire row
    useEffect(() => {
        if (!isDataRow || !containerRef.current)
            return;
        const rowKey = `${props.tableId}-${props.rowIndex}`;
        const edge = props.isDraggedOver === 'top' || props.isDraggedOver === 'bottom'
            ? props.isDraggedOver
            : null;
        containerRef.current.dispatchEvent(new CustomEvent('itl:row-drag-over', {
            bubbles: true,
            detail: { edge, rowKey },
        }));
    }, [isDataRow, props.isDraggedOver, props.rowIndex, props.tableId]);
    const handleClick = useDoubleClick({
        onDoubleClick: (event) => {
            if (isDataRow && item) {
                const rowId = props.internalState.extractRowId(item);
                const index = rowId ? props.internalState.findItemIndex(rowId) : -1;
                props.controls.onDoubleClick?.({
                    event,
                    index,
                    internalState: props.internalState,
                    item: item,
                    itemType: props.itemType,
                });
            }
        },
        onSingleClick: (event) => {
            // Don't trigger row selection if clicking on interactive elements
            const target = event.target;
            const isInteractiveElement = target.closest('button, a, input, select, textarea, [role="button"]');
            if (isInteractiveElement) {
                return;
            }
            if (isDataRow && item && props.enableSelection) {
                const rowId = props.internalState.extractRowId(item);
                const index = rowId ? props.internalState.findItemIndex(rowId) : -1;
                props.controls.onClick?.({
                    event,
                    index,
                    internalState: props.internalState,
                    item: item,
                    itemType: props.itemType,
                });
            }
        },
    });
    const handleContextMenu = (event) => {
        if (isDataRow && item) {
            event.preventDefault();
            const rowId = props.internalState.extractRowId(item);
            const index = rowId ? props.internalState.findItemIndex(rowId) : -1;
            props.controls.onMore?.({
                event,
                index,
                internalState: props.internalState,
                item: item,
                itemType: props.itemType,
            });
        }
    };
    return (_jsx("div", { className: clsx(styles.container, props.containerClassName, {
            [styles.alternateRowEven]: props.enableAlternateRowColors && isDataRow && dataIndex % 2 === 0,
            [styles.alternateRowOdd]: props.enableAlternateRowColors && isDataRow && dataIndex % 2 === 1,
            [styles.center]: props.columns[props.columnIndex].align === 'center',
            [styles.compact]: props.size === 'compact',
            [styles.dataRow]: isDataRow,
            [styles.dragging]: isDataRow && isDragging,
            [styles.large]: props.size === 'large',
            [styles.left]: props.columns[props.columnIndex].align === 'start',
            [styles.noHorizontalPadding]: isNoHorizontalPaddingColumn(props.type),
            [styles.paddingLg]: props.cellPadding === 'lg',
            [styles.paddingMd]: props.cellPadding === 'md',
            [styles.paddingSm]: props.cellPadding === 'sm',
            [styles.paddingXl]: props.cellPadding === 'xl',
            [styles.paddingXs]: props.cellPadding === 'xs',
            [styles.right]: props.columns[props.columnIndex].align === 'end',
            [styles.rowHoverHighlightEnabled]: isDataRow && props.enableRowHoverHighlight,
            [styles.rowSelected]: isDataRow && isSelected,
            [styles.withHorizontalBorder]: props.enableHorizontalBorders &&
                props.enableHeader &&
                props.rowIndex > 0 &&
                (isAlbumGroupingActive(props.columns)
                    ? isLastInAlbumGroup(props.rowIndex, props.getRowItem, !!props.enableHeader, props.data.length)
                    : props.rowIndex === 1 || !isLastRow),
            [styles.withVerticalBorder]: props.enableVerticalBorders && !isLastColumn,
        }), "data-row-index": isDataRow ? `${props.tableId}-${props.rowIndex}` : undefined, onClick: handleClick, onContextMenu: handleContextMenu, ref: mergedRef, style: props.style, children: _jsx(Text, { className: clsx(styles.content, props.className, {
                [styles.compact]: props.size === 'compact',
                [styles.large]: props.size === 'large',
            }), isMuted: !NonMutedColumns.includes(props.type), isNoSelect: true, children: props.children }) }));
};
export const TableColumnContainer = (props) => {
    const containerRef = useRef(null);
    const isDataRow = props.enableHeader ? props.rowIndex > 0 : true;
    const dataIndex = props.enableHeader ? props.rowIndex - 1 : props.rowIndex;
    const item = isDataRow
        ? (props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex])
        : null;
    const itemRowId = item && typeof item === 'object' && 'id' in item
        ? props.internalState.extractRowId(item)
        : undefined;
    const isSelected = useItemSelectionState(props.internalState, itemRowId || undefined);
    const isDragging = props.isDragging ?? false;
    const mergedRef = useMergedRef(containerRef, props.dragRef ?? null);
    const isLastColumn = props.columnIndex === props.columns.length - 1;
    const isLastRow = isDataRow &&
        (props.enableHeader
            ? props.rowIndex === props.data.length
            : props.rowIndex === props.data.length - 1);
    // Apply dragged over state to all cells in the row so border can span entire row
    useEffect(() => {
        if (!isDataRow || !containerRef.current)
            return;
        const rowKey = `${props.tableId}-${props.rowIndex}`;
        const edge = props.isDraggedOver === 'top' || props.isDraggedOver === 'bottom'
            ? props.isDraggedOver
            : null;
        containerRef.current.dispatchEvent(new CustomEvent('itl:row-drag-over', {
            bubbles: true,
            detail: { edge, rowKey },
        }));
    }, [isDataRow, props.isDraggedOver, props.rowIndex, props.tableId]);
    const handleClick = useDoubleClick({
        onDoubleClick: (event) => {
            if (isDataRow && item) {
                const rowId = props.internalState.extractRowId(item);
                const index = rowId ? props.internalState.findItemIndex(rowId) : -1;
                props.controls.onDoubleClick?.({
                    event,
                    index,
                    internalState: props.internalState,
                    item: item,
                    itemType: props.itemType,
                });
            }
        },
        onSingleClick: (event) => {
            // Don't trigger row selection if clicking on interactive elements
            const target = event.target;
            const isInteractiveElement = target.closest('button, a, input, select, textarea, [role="button"]');
            if (isInteractiveElement) {
                return;
            }
            if (isDataRow && item && props.enableSelection) {
                const rowId = props.internalState.extractRowId(item);
                const index = rowId ? props.internalState.findItemIndex(rowId) : -1;
                props.controls.onClick?.({
                    event,
                    index,
                    internalState: props.internalState,
                    item: item,
                    itemType: props.itemType,
                });
            }
        },
    });
    const handleContextMenu = (event) => {
        if (isDataRow && item) {
            event.preventDefault();
            const rowId = props.internalState.extractRowId(item);
            const index = rowId ? props.internalState.findItemIndex(rowId) : -1;
            props.controls.onMore?.({
                event,
                index,
                internalState: props.internalState,
                item: item,
                itemType: props.itemType,
            });
        }
    };
    return (_jsx("div", { className: clsx(styles.container, props.className, {
            [styles.alternateRowEven]: props.enableAlternateRowColors && isDataRow && dataIndex % 2 === 0,
            [styles.alternateRowOdd]: props.enableAlternateRowColors && isDataRow && dataIndex % 2 === 1,
            [styles.center]: props.columns[props.columnIndex].align === 'center',
            [styles.compact]: props.size === 'compact',
            [styles.dataRow]: isDataRow,
            [styles.dragging]: isDataRow && isDragging,
            [styles.large]: props.size === 'large',
            [styles.left]: props.columns[props.columnIndex].align === 'start',
            [styles.noHorizontalPadding]: isNoHorizontalPaddingColumn(props.type),
            [styles.paddingLg]: props.cellPadding === 'lg',
            [styles.paddingMd]: props.cellPadding === 'md',
            [styles.paddingSm]: props.cellPadding === 'sm',
            [styles.paddingXl]: props.cellPadding === 'xl',
            [styles.paddingXs]: props.cellPadding === 'xs',
            [styles.right]: props.columns[props.columnIndex].align === 'end',
            [styles.rowHoverHighlightEnabled]: isDataRow &&
                props.enableRowHoverHighlight &&
                props.type !== TableColumn.ALBUM_GROUP,
            [styles.rowSelected]: isDataRow && isSelected && props.type !== TableColumn.ALBUM_GROUP,
            [styles.withHorizontalBorder]: props.enableHorizontalBorders &&
                props.enableHeader &&
                props.rowIndex > 0 &&
                (isAlbumGroupingActive(props.columns)
                    ? isLastInAlbumGroup(props.rowIndex, props.getRowItem, !!props.enableHeader, props.data.length)
                    : props.rowIndex === 1 || !isLastRow),
            [styles.withVerticalBorder]: props.enableVerticalBorders && !isLastColumn,
        }), "data-row-index": isDataRow ? `${props.tableId}-${props.rowIndex}` : undefined, onClick: handleClick, onContextMenu: handleContextMenu, ref: mergedRef, style: { ...props.containerStyle, ...props.style }, children: props.children }));
};
const ColumnResizeHandle = ({ columnId, columnIndex, disabled = false, initialWidth, onResize, side, }) => {
    const [isDragging, setIsDragging] = useState(false);
    const handleRef = useRef(null);
    const startWidthRef = useRef(initialWidth);
    const startXRef = useRef(0);
    const finalWidthRef = useRef(initialWidth);
    const columnResizeLive = useItemTableListColumnResizeLive();
    const onResizeRef = useRef(onResize);
    const columnResizeLiveRef = useRef(columnResizeLive);
    useEffect(() => {
        onResizeRef.current = onResize;
    }, [onResize]);
    useEffect(() => {
        columnResizeLiveRef.current = columnResizeLive;
    }, [columnResizeLive]);
    // Update the ref when initialWidth changes (but not during drag)
    useEffect(() => {
        if (!isDragging) {
            startWidthRef.current = initialWidth;
        }
    }, [initialWidth, isDragging]);
    useEffect(() => {
        if (!isDragging)
            return;
        const handleMouseMove = (event) => {
            const deltaX = event.clientX - startXRef.current;
            const newWidth = Math.min(Math.max(10, startWidthRef.current + deltaX), 1000);
            finalWidthRef.current = newWidth;
            columnResizeLiveRef.current?.scheduleColumnResizePreview(columnIndex, newWidth);
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            onResizeRef.current(columnId, finalWidthRef.current);
            columnResizeLiveRef.current?.clearColumnResizePreview();
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            columnResizeLiveRef.current?.clearColumnResizePreview();
        };
    }, [isDragging, columnId, columnIndex]);
    const handleMouseDown = (event) => {
        if (disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
        startWidthRef.current = initialWidth;
        startXRef.current = event.clientX;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };
    return (_jsx("div", { className: clsx(styles.resizeHandle, {
            [styles.resizeHandleDisabled]: disabled,
            [styles.resizeHandleDragging]: isDragging,
            [styles.resizeHandleLeft]: side === 'left',
            [styles.resizeHandleRight]: side === 'right',
        }), onMouseDown: handleMouseDown, ref: handleRef }));
};
export const TableColumnHeaderContainer = (props) => {
    const columnConfig = props.columns[props.columnIndex];
    // Use the actual rendered width from style if available, otherwise fall back to config width
    const currentWidth = props.style?.width || columnConfig.width;
    const handleResize = (columnId, width) => {
        props.controls.onColumnResized?.({ columnId, width });
    };
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggedOver, setIsDraggedOver] = useState(null);
    useEffect(() => {
        if (!containerRef.current ||
            !props.enableColumnReorder ||
            props.type === TableColumn.LAYOUT_FILL) {
            return;
        }
        const handleReorder = (columnIdFrom, columnIdTo, edge) => {
            props.controls.onColumnReordered?.({ columnIdFrom, columnIdTo, edge });
        };
        return combine(draggable({
            element: containerRef.current,
            getInitialData: () => {
                const data = dndUtils.generateDragData({
                    id: [props.type],
                    operation: [DragOperation.REORDER],
                    type: DragTarget.TABLE_COLUMN,
                }, { tableId: props.tableId });
                return data;
            },
            onDragStart: () => {
                setIsDragging(true);
            },
            onDrop: () => {
                setIsDragging(false);
            },
            onGenerateDragPreview: (data) => {
                disableNativeDragPreview({ nativeSetDragImage: data.nativeSetDragImage });
            },
        }), dropTargetForElements({
            canDrop: (args) => {
                const data = args.source.data;
                const sourceTableId = data.metadata?.tableId;
                const isSelf = args.source.data.id[0] === props.type;
                const isSameTable = sourceTableId === props.tableId;
                return (dndUtils.isDropTarget(data.type, [DragTarget.TABLE_COLUMN]) &&
                    !isSelf &&
                    isSameTable);
            },
            element: containerRef.current,
            getData: ({ element, input }) => {
                const data = dndUtils.generateDragData({
                    id: [props.type],
                    operation: [DragOperation.REORDER],
                    type: DragTarget.TABLE_COLUMN,
                }, { tableId: props.tableId });
                return attachClosestEdge(data, {
                    allowedEdges: ['left', 'right'],
                    element,
                    input,
                });
            },
            onDrag: (args) => {
                const closestEdgeOfTarget = extractClosestEdge(args.self.data);
                setIsDraggedOver(closestEdgeOfTarget);
            },
            onDragLeave: () => {
                setIsDraggedOver(null);
            },
            onDrop: (args) => {
                const closestEdgeOfTarget = extractClosestEdge(args.self.data);
                const from = args.source.data.id;
                const to = args.self.data.id;
                handleReorder(from[0], to[0], closestEdgeOfTarget);
                setIsDraggedOver(null);
            },
        }));
    }, [props.type, props.enableColumnReorder, props.controls, props.tableId]);
    return (_jsxs(Flex, { className: clsx(styles.container, styles.headerContainer, props.containerClassName, {
            [styles.headerDraggedOverLeft]: isDraggedOver === 'left',
            [styles.headerDraggedOverRight]: isDraggedOver === 'right',
            [styles.headerDragging]: isDragging,
            [styles.noHorizontalPadding]: isNoHorizontalPaddingColumn(props.type),
            [styles.paddingLg]: props.cellPadding === 'lg',
            [styles.paddingMd]: props.cellPadding === 'md',
            [styles.paddingSm]: props.cellPadding === 'sm',
            [styles.paddingXl]: props.cellPadding === 'xl',
            [styles.paddingXs]: props.cellPadding === 'xs',
        }), ref: containerRef, style: props.style, children: [_jsx(Text, { className: clsx(styles.headerContent, props.className, {
                    [styles.center]: props.columns[props.columnIndex].align === 'center',
                    [styles.left]: props.columns[props.columnIndex].align === 'start',
                    [styles.right]: props.columns[props.columnIndex].align === 'end',
                }), isNoSelect: true, children: columnLabelMap[props.type] }), props.enableColumnResize && (_jsx(ColumnResizeHandle, { columnId: props.type, columnIndex: props.columnIndex, disabled: !!columnConfig.autoSize, initialWidth: currentWidth, onResize: handleResize, side: "right" }))] }));
};
export const columnLabelMap = {
    [TableColumn.ACTIONS]: (_jsx(Flex, { className: styles.headerIconWrapper, children: _jsx(Icon, { fill: "default", icon: "ellipsisHorizontal" }) })),
    [TableColumn.ALBUM]: i18n.t('table.column.album', { postProcess: 'upperCase' }),
    [TableColumn.ALBUM_ARTIST]: i18n.t('table.column.albumArtist', {
        postProcess: 'upperCase',
    }),
    [TableColumn.ALBUM_COUNT]: i18n.t('table.column.albumCount', {
        postProcess: 'upperCase',
    }),
    [TableColumn.ALBUM_GROUP]: i18n.t('table.config.label.albumGroup', {
        postProcess: 'upperCase',
    }),
    [TableColumn.ARTIST]: i18n.t('table.column.artist', { postProcess: 'upperCase' }),
    [TableColumn.BIOGRAPHY]: i18n.t('table.column.biography', {
        postProcess: 'upperCase',
    }),
    [TableColumn.BIT_DEPTH]: i18n.t('table.column.bitDepth', {
        postProcess: 'upperCase',
    }),
    [TableColumn.BIT_RATE]: i18n.t('table.column.bitrate', { postProcess: 'upperCase' }),
    [TableColumn.BPM]: i18n.t('table.column.bpm', { postProcess: 'upperCase' }),
    [TableColumn.CHANNELS]: i18n.t('table.column.channels', { postProcess: 'upperCase' }),
    [TableColumn.CODEC]: i18n.t('table.column.codec', { postProcess: 'upperCase' }),
    [TableColumn.COMMENT]: i18n.t('table.column.comment', { postProcess: 'upperCase' }),
    [TableColumn.COMPOSER]: i18n.t('table.config.label.composer', {
        postProcess: 'upperCase',
    }),
    [TableColumn.DATE_ADDED]: i18n.t('table.column.dateAdded', {
        postProcess: 'upperCase',
    }),
    [TableColumn.DISC_NUMBER]: (_jsx(Flex, { className: styles.headerIconWrapper, children: _jsx(Icon, { icon: "disc" }) })),
    [TableColumn.DURATION]: (_jsx(Flex, { className: styles.headerIconWrapper, children: _jsx(Icon, { icon: "duration" }) })),
    [TableColumn.GENRE]: i18n.t('table.column.genre', { postProcess: 'upperCase' }),
    [TableColumn.GENRE_BADGE]: i18n.t('table.column.genre', {
        postProcess: 'upperCase',
    }),
    [TableColumn.ID]: 'ID',
    [TableColumn.IMAGE]: '',
    [TableColumn.LAST_PLAYED]: i18n.t('table.column.lastPlayed', {
        postProcess: 'upperCase',
    }),
    [TableColumn.LAYOUT_FILL]: '',
    [TableColumn.OWNER]: i18n.t('table.column.owner', { postProcess: 'upperCase' }),
    [TableColumn.PATH]: i18n.t('table.column.path', { postProcess: 'upperCase' }),
    [TableColumn.PLAY_COUNT]: i18n.t('table.column.playCount', {
        postProcess: 'upperCase',
    }),
    [TableColumn.PLAYLIST_REORDER]: (_jsx(Flex, { className: styles.headerIconWrapper, children: _jsx(Icon, { icon: "dragVertical" }) })),
    [TableColumn.RELEASE_DATE]: i18n.t('table.column.releaseDate', {
        postProcess: 'upperCase',
    }),
    [TableColumn.ROW_INDEX]: (_jsx(Flex, { className: styles.headerIconWrapper, children: _jsx(Icon, { icon: "hash" }) })),
    [TableColumn.SAMPLE_RATE]: i18n.t('table.column.sampleRate', {
        postProcess: 'upperCase',
    }),
    [TableColumn.SIZE]: i18n.t('table.column.size', { postProcess: 'upperCase' }),
    [TableColumn.SKIP]: '',
    [TableColumn.SONG_COUNT]: i18n.t('table.column.songCount', {
        postProcess: 'upperCase',
    }),
    [TableColumn.TITLE]: i18n.t('table.column.title', { postProcess: 'upperCase' }),
    [TableColumn.TITLE_ARTIST]: i18n.t('table.column.title', {
        postProcess: 'upperCase',
    }),
    [TableColumn.TITLE_COMBINED]: i18n.t('table.column.title', {
        postProcess: 'upperCase',
    }),
    [TableColumn.TRACK_NUMBER]: (_jsx(Flex, { className: styles.headerIconWrapper, children: _jsx(Icon, { icon: "itemSong" }) })),
    [TableColumn.USER_FAVORITE]: (_jsx(Flex, { className: styles.headerIconWrapper, children: _jsx(Icon, { icon: "favorite" }) })),
    [TableColumn.USER_RATING]: (_jsx(Flex, { className: styles.headerIconWrapper, children: _jsx(Icon, { icon: "star" }) })),
    [TableColumn.YEAR]: i18n.t('table.column.releaseYear', { postProcess: 'upperCase' }),
};
export const ColumnNullFallback = (props) => {
    return _jsx(TableColumnTextContainer, { ...props, children: "\u00A0" });
};
export const ColumnSkeletonVariable = (props) => {
    return (_jsx(TableColumnContainer, { ...props, children: _jsx(Skeleton, { height: "1rem", width: `${props.rowIndex % 2 === 0 ? '80%' : '60%'}` }) }));
};
export const ColumnSkeletonFixed = (props) => {
    return (_jsx(TableColumnContainer, { ...props, children: _jsx(Skeleton, { height: "1rem", width: "80%" }) }));
};

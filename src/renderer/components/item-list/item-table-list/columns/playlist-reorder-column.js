import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import styles from './playlist-reorder-column.module.css';
import { getDraggedItems } from '/@/renderer/components/item-list/helpers/get-dragged-items';
import { useItemDraggingState } from '/@/renderer/components/item-list/helpers/item-list-state';
import { TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { useDragDrop } from '/@/renderer/hooks/use-drag-drop';
import { ActionIcon, ActionIconGroup } from '/@/shared/components/action-icon/action-icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useLongPress } from '/@/shared/hooks/use-long-press';
import { LibraryItem } from '/@/shared/types/domain-types';
import { DragOperation, DragTarget, DragTargetMap } from '/@/shared/types/drag-and-drop';
const PlaylistReorderColumnBase = (props) => {
    const { t } = useTranslation();
    const { playlistId } = useParams();
    const isHeaderEnabled = !!props.enableHeader;
    const isDataRow = isHeaderEnabled ? props.rowIndex > 0 : true;
    const item = isDataRow
        ? (props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex])
        : null;
    const isPlaylistSong = props.itemType === LibraryItem.PLAYLIST_SONG;
    const { isDraggedOver, isDragging: isDraggingLocal, ref: dragRef, } = useDragDrop({
        drag: {
            getId: () => {
                if (!item || !isDataRow || !isPlaylistSong) {
                    return [];
                }
                const draggedItems = getDraggedItems(item, props.internalState);
                return draggedItems.map((draggedItem) => draggedItem.id);
            },
            getItem: () => {
                if (!item || !isDataRow || !isPlaylistSong) {
                    return [];
                }
                const draggedItems = getDraggedItems(item, props.internalState);
                return draggedItems;
            },
            itemType: LibraryItem.PLAYLIST_SONG,
            metadata: { fromReorderHandle: true },
            onDragStart: () => {
                if (!item || !isDataRow || !isPlaylistSong) {
                    return;
                }
                const draggedItems = getDraggedItems(item, props.internalState);
                if (props.internalState) {
                    props.internalState.setDragging(draggedItems);
                }
            },
            onDrop: () => {
                if (props.internalState) {
                    props.internalState.setDragging([]);
                }
            },
            operation: [DragOperation.REORDER],
            target: DragTargetMap[LibraryItem.PLAYLIST_SONG] || DragTarget.SONG,
        },
        drop: {
            canDrop: (args) => {
                // Only allow drops from PLAYLIST_SONG items
                return (args.source.itemType === LibraryItem.PLAYLIST_SONG &&
                    isPlaylistSong &&
                    isDataRow);
            },
            getData: () => {
                if (!item || !isDataRow) {
                    return {
                        id: [],
                        item: [],
                        itemType: LibraryItem.PLAYLIST_SONG,
                        type: DragTarget.SONG,
                    };
                }
                return {
                    id: [item.id],
                    item: [item],
                    itemType: LibraryItem.PLAYLIST_SONG,
                    type: DragTargetMap[LibraryItem.PLAYLIST_SONG] || DragTarget.SONG,
                };
            },
            onDrag: () => {
                // Visual feedback is handled by isDraggedOver state
            },
            onDragLeave: () => {
                // Visual feedback is handled by isDraggedOver state
            },
            onDrop: (args) => {
                if (!item || !isDataRow || !isPlaylistSong) {
                    return;
                }
                // Only handle drops from PLAYLIST_SONG items
                if (args.source.itemType !== LibraryItem.PLAYLIST_SONG) {
                    return;
                }
                const sourceItems = (args.source.item || []);
                const targetItem = item;
                if (sourceItems.length > 0 &&
                    args.edge &&
                    (args.edge === 'top' || args.edge === 'bottom') &&
                    playlistId) {
                    // Emit event to reorder playlist songs
                    eventEmitter.emit('PLAYLIST_REORDER', {
                        edge: args.edge,
                        playlistId,
                        sourceIds: args.source.id,
                        targetId: targetItem.id,
                    });
                }
                if (props.internalState) {
                    props.internalState.setDragging([]);
                }
            },
        },
        isEnabled: isPlaylistSong && isDataRow && !!item,
    });
    const draggedOverEdge = isDraggedOver === 'top' || isDraggedOver === 'bottom' ? isDraggedOver : null;
    const itemRowId = item && typeof item === 'object' && 'id' in item && props.internalState
        ? props.internalState.extractRowId(item)
        : undefined;
    const isDraggingState = useItemDraggingState(props.internalState, itemRowId ||
        (item && typeof item === 'object' && 'id' in item ? item.id : undefined));
    const isDragging = props.internalState ? isDraggingState : isDraggingLocal;
    const getValidDataItems = useCallback(() => {
        return props.internalState.getData().filter((d) => d !== null && d.id);
    }, [props.internalState]);
    const handleMoveUp = useCallback(() => {
        if (!item || !isDataRow || !isPlaylistSong || !playlistId) {
            return;
        }
        const validItems = getValidDataItems();
        const selectedItems = getDraggedItems(item, props.internalState);
        const sourceIds = selectedItems.map((draggedItem) => draggedItem.id);
        if (sourceIds.length === 0) {
            return;
        }
        let topmostIndex = validItems.length;
        for (const selectedItem of selectedItems) {
            const index = validItems.findIndex((d) => d.id === selectedItem.id);
            if (index !== -1 && index < topmostIndex) {
                topmostIndex = index;
            }
        }
        if (topmostIndex <= 0) {
            return;
        }
        const targetItem = validItems[topmostIndex - 1];
        eventEmitter.emit('PLAYLIST_REORDER', {
            edge: 'top',
            playlistId,
            sourceIds,
            targetId: targetItem.id,
        });
    }, [item, isDataRow, isPlaylistSong, playlistId, getValidDataItems, props.internalState]);
    const handleMoveToTop = useCallback(() => {
        if (!item || !isDataRow || !isPlaylistSong || !playlistId) {
            return;
        }
        const validItems = getValidDataItems();
        const selectedItems = getDraggedItems(item, props.internalState);
        const sourceIds = selectedItems.map((draggedItem) => draggedItem.id);
        if (sourceIds.length === 0) {
            return;
        }
        const firstItem = validItems[0];
        const isAlreadyAtTop = selectedItems.some((selectedItem) => selectedItem.id === firstItem.id);
        if (!firstItem || isAlreadyAtTop) {
            return;
        }
        eventEmitter.emit('PLAYLIST_REORDER', {
            edge: 'top',
            playlistId,
            sourceIds,
            targetId: firstItem.id,
        });
    }, [item, isDataRow, isPlaylistSong, playlistId, getValidDataItems, props.internalState]);
    const handleMoveDown = useCallback(() => {
        if (!item || !isDataRow || !isPlaylistSong || !playlistId) {
            return;
        }
        const validItems = getValidDataItems();
        const selectedItems = getDraggedItems(item, props.internalState);
        const sourceIds = selectedItems.map((draggedItem) => draggedItem.id);
        if (sourceIds.length === 0) {
            return;
        }
        let bottommostIndex = -1;
        for (const selectedItem of selectedItems) {
            const index = validItems.findIndex((d) => d.id === selectedItem.id);
            if (index !== -1 && index > bottommostIndex) {
                bottommostIndex = index;
            }
        }
        if (bottommostIndex === -1 || bottommostIndex >= validItems.length - 1) {
            return;
        }
        const targetItem = validItems[bottommostIndex + 1];
        eventEmitter.emit('PLAYLIST_REORDER', {
            edge: 'bottom',
            playlistId,
            sourceIds,
            targetId: targetItem.id,
        });
    }, [item, isDataRow, isPlaylistSong, playlistId, getValidDataItems, props.internalState]);
    const handleMoveToBottom = useCallback(() => {
        if (!item || !isDataRow || !isPlaylistSong || !playlistId) {
            return;
        }
        const validItems = getValidDataItems();
        const selectedItems = getDraggedItems(item, props.internalState);
        const sourceIds = selectedItems.map((draggedItem) => draggedItem.id);
        if (sourceIds.length === 0) {
            return;
        }
        const lastItem = validItems[validItems.length - 1];
        const isAlreadyAtBottom = selectedItems.some((selectedItem) => selectedItem.id === lastItem.id);
        if (!lastItem || isAlreadyAtBottom) {
            return;
        }
        eventEmitter.emit('PLAYLIST_REORDER', {
            edge: 'bottom',
            playlistId,
            sourceIds,
            targetId: lastItem.id,
        });
    }, [item, isDataRow, isPlaylistSong, playlistId, getValidDataItems, props.internalState]);
    const upButtonHandlers = useLongPress({
        onClick: handleMoveUp,
        onLongPress: handleMoveToTop,
    });
    const downButtonHandlers = useLongPress({
        onClick: handleMoveDown,
        onLongPress: handleMoveToBottom,
    });
    return (_jsx(TableColumnContainer, { ...props, isDraggedOver: draggedOverEdge, isDragging: isDragging, children: _jsxs(ActionIconGroup, { className: styles.group, w: "100%", children: [_jsx(ActionIcon, { ...upButtonHandlers, icon: "arrowUp", iconProps: { size: 'md' }, size: "xs", tooltip: {
                        label: (_jsx(_Fragment, { children: _jsxs(Stack, { gap: "xs", justify: "center", children: [_jsx(Text, { fw: 500, ta: "center", children: t('action.moveUp', { postProcess: 'sentenceCase' }) }), _jsx(Text, { fw: 500, isMuted: true, size: "xs", ta: "center", children: t('action.holdToMoveToTop', {
                                            postProcess: 'sentenceCase',
                                        }) })] }) })),
                    }, variant: "default" }), _jsx(ActionIcon, { ...downButtonHandlers, icon: "arrowDown", iconProps: { size: 'md' }, size: "xs", tooltip: {
                        label: (_jsx(_Fragment, { children: _jsxs(Stack, { gap: "xs", justify: "center", children: [_jsx(Text, { fw: 500, ta: "center", children: t('action.moveDown', { postProcess: 'sentenceCase' }) }), _jsx(Text, { fw: 500, isMuted: true, size: "xs", ta: "center", children: t('action.holdToMoveToBottom', {
                                            postProcess: 'sentenceCase',
                                        }) })] }) })),
                    }, variant: "default" }), _jsx(ActionIcon, { icon: "dragVertical", iconProps: { size: 'md' }, ref: dragRef, size: "xs", variant: "default" })] }) }));
};
export const PlaylistReorderColumn = PlaylistReorderColumnBase;

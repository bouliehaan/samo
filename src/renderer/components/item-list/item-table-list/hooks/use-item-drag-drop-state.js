import { getDraggedItems } from '/@/renderer/components/item-list/helpers/get-dragged-items';
import { useItemDraggingState } from '/@/renderer/components/item-list/helpers/item-list-state';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { useDragDrop } from '/@/renderer/hooks/use-drag-drop';
import { LibraryItem } from '/@/shared/types/domain-types';
import { DragOperation, DragTarget, DragTargetMap } from '/@/shared/types/drag-and-drop';
export const useItemDragDropState = ({ enableDrag, internalState, isDataRow, item, itemType, playerContext, playlistId, }) => {
    const shouldEnableDrag = enableDrag && isDataRow && !!item;
    const needsDropRegistration = shouldEnableDrag &&
        (itemType === LibraryItem.QUEUE_SONG || itemType === LibraryItem.PLAYLIST_SONG);
    const { isDraggedOver, isDragging: isDraggingLocal, ref: dragRef, } = useDragDrop({
        drag: shouldEnableDrag
            ? {
                getId: () => {
                    if (!item || !isDataRow) {
                        return [];
                    }
                    const draggedItems = getDraggedItems(item, internalState);
                    return draggedItems.map((draggedItem) => draggedItem.id);
                },
                getItem: () => {
                    if (!item || !isDataRow) {
                        return [];
                    }
                    const draggedItems = getDraggedItems(item, internalState);
                    return draggedItems;
                },
                itemType,
                onDragStart: () => {
                    if (!item || !isDataRow) {
                        return;
                    }
                    const draggedItems = getDraggedItems(item, internalState);
                    if (internalState) {
                        internalState.setDragging(draggedItems);
                    }
                },
                onDrop: () => {
                    if (internalState) {
                        internalState.setDragging([]);
                    }
                },
                operation: itemType === LibraryItem.QUEUE_SONG
                    ? [DragOperation.REORDER, DragOperation.ADD]
                    : itemType === LibraryItem.PLAYLIST_SONG
                        ? [DragOperation.REORDER, DragOperation.ADD]
                        : [DragOperation.ADD],
                target: DragTargetMap[itemType] || DragTarget.GENERIC,
            }
            : undefined,
        drop: needsDropRegistration
            ? {
                canDrop: (args) => {
                    if (args.source.type === DragTarget.TABLE_COLUMN) {
                        return false;
                    }
                    // Allow drops for QUEUE_SONG (queue reordering)
                    if (itemType === LibraryItem.QUEUE_SONG) {
                        return true;
                    }
                    // Allow drops for PLAYLIST_SONG (playlist reordering)
                    // Only allow drops when drag is started from the reorder handle
                    if (itemType === LibraryItem.PLAYLIST_SONG &&
                        args.source.itemType === LibraryItem.PLAYLIST_SONG &&
                        args.source.metadata?.fromReorderHandle === true) {
                        return true;
                    }
                    return false;
                },
                getData: () => {
                    return {
                        id: [item.id],
                        item: [item],
                        itemType,
                        type: DragTargetMap[itemType] || DragTarget.GENERIC,
                    };
                },
                onDrag: () => {
                    return;
                },
                onDragLeave: () => {
                    return;
                },
                onDrop: (args) => {
                    if (args.self.type === DragTarget.QUEUE_SONG) {
                        const sourceServerId = (args.source.item?.[0])._serverId;
                        const sourceItemType = args.source.itemType;
                        const droppedOnUniqueId = (args.self.item?.[0])._uniqueId;
                        switch (args.source.type) {
                            case DragTarget.ALBUM: {
                                playerContext.addToQueueByFetch(sourceServerId, args.source.id, sourceItemType, { edge: args.edge, uniqueId: droppedOnUniqueId });
                                break;
                            }
                            case DragTarget.ALBUM_ARTIST: {
                                playerContext.addToQueueByFetch(sourceServerId, args.source.id, sourceItemType, { edge: args.edge, uniqueId: droppedOnUniqueId });
                                break;
                            }
                            case DragTarget.ARTIST: {
                                playerContext.addToQueueByFetch(sourceServerId, args.source.id, sourceItemType, { edge: args.edge, uniqueId: droppedOnUniqueId });
                                break;
                            }
                            case DragTarget.FOLDER: {
                                const items = args.source.item;
                                const { folders, songs } = (items || []).reduce((acc, item) => {
                                    if (item._itemType ===
                                        LibraryItem.SONG) {
                                        acc.songs.push(item);
                                    }
                                    else if (item._itemType ===
                                        LibraryItem.FOLDER) {
                                        acc.folders.push(item);
                                    }
                                    return acc;
                                }, { folders: [], songs: [] });
                                const folderIds = folders.map((folder) => folder.id);
                                // Handle folders: fetch and add to queue
                                if (folderIds.length > 0) {
                                    playerContext.addToQueueByFetch(sourceServerId, folderIds, LibraryItem.FOLDER, { edge: args.edge, uniqueId: droppedOnUniqueId });
                                }
                                // Handle songs: add directly to queue
                                if (songs.length > 0) {
                                    playerContext.addToQueueByData(songs, {
                                        edge: args.edge,
                                        uniqueId: droppedOnUniqueId,
                                    });
                                }
                                break;
                            }
                            case DragTarget.GENRE: {
                                playerContext.addToQueueByFetch(sourceServerId, args.source.id, sourceItemType, { edge: args.edge, uniqueId: droppedOnUniqueId });
                                break;
                            }
                            case DragTarget.PLAYLIST: {
                                playerContext.addToQueueByFetch(sourceServerId, args.source.id, sourceItemType, { edge: args.edge, uniqueId: droppedOnUniqueId });
                                break;
                            }
                            case DragTarget.QUEUE_SONG: {
                                const sourceItems = (args.source.item || []);
                                if (sourceItems.length > 0 &&
                                    args.edge &&
                                    (args.edge === 'top' || args.edge === 'bottom')) {
                                    playerContext.moveSelectedTo(sourceItems, args.edge, droppedOnUniqueId);
                                }
                                break;
                            }
                            case DragTarget.SONG: {
                                const sourceItems = (args.source.item || []);
                                if (sourceItems.length > 0) {
                                    playerContext.addToQueueByData(sourceItems, {
                                        edge: args.edge,
                                        uniqueId: droppedOnUniqueId,
                                    });
                                }
                                break;
                            }
                            default: {
                                break;
                            }
                        }
                    }
                    // Handle PLAYLIST_SONG reordering
                    // Only allow drops when drag is started from the reorder handle
                    if (args.self.itemType === LibraryItem.PLAYLIST_SONG &&
                        args.source.itemType === LibraryItem.PLAYLIST_SONG &&
                        args.source.metadata?.fromReorderHandle === true &&
                        playlistId) {
                        const sourceItems = (args.source.item || []);
                        const targetItem = item;
                        if (sourceItems.length > 0 &&
                            args.edge &&
                            (args.edge === 'top' || args.edge === 'bottom') &&
                            targetItem) {
                            // Emit event to reorder playlist songs
                            eventEmitter.emit('PLAYLIST_REORDER', {
                                edge: args.edge,
                                playlistId,
                                sourceIds: args.source.id,
                                targetId: targetItem.id,
                            });
                        }
                    }
                    if (internalState) {
                        internalState.setDragging([]);
                    }
                    return;
                },
            }
            : undefined,
        isEnabled: shouldEnableDrag,
    });
    const itemRowId = item && typeof item === 'object' && 'id' in item && internalState
        ? internalState.extractRowId(item)
        : undefined;
    const isDraggingState = useItemDraggingState(internalState, itemRowId ||
        (item && typeof item === 'object' && 'id' in item ? item.id : undefined));
    const isDragging = internalState ? isDraggingState : isDraggingLocal;
    return {
        dragRef: shouldEnableDrag ? dragRef : null,
        isDraggedOver: isDraggedOver === 'top' || isDraggedOver === 'bottom' ? isDraggedOver : null,
        isDragging,
    };
};

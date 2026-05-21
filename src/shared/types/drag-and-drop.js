import { LibraryItem } from '/@/shared/types/domain-types';
export var DragTarget;
(function (DragTarget) {
    DragTarget["ALBUM"] = "album";
    DragTarget["ALBUM_ARTIST"] = "albumArtist";
    DragTarget["ARTIST"] = "artist";
    DragTarget["FOLDER"] = "folder";
    DragTarget["GENERIC"] = "generic";
    DragTarget["GENRE"] = "genre";
    DragTarget["GRID_ROW"] = "gridRow";
    DragTarget["PLAYLIST"] = "playlist";
    DragTarget["QUEUE_SONG"] = "queueSong";
    DragTarget["SONG"] = "song";
    DragTarget["TABLE_COLUMN"] = "tableColumn";
})(DragTarget || (DragTarget = {}));
export const DragTargetMap = {
    [LibraryItem.ALBUM]: DragTarget.ALBUM,
    [LibraryItem.ALBUM_ARTIST]: DragTarget.ALBUM_ARTIST,
    [LibraryItem.ARTIST]: DragTarget.ARTIST,
    [LibraryItem.FOLDER]: DragTarget.FOLDER,
    [LibraryItem.GENRE]: DragTarget.GENRE,
    [LibraryItem.PLAYLIST]: DragTarget.PLAYLIST,
    [LibraryItem.PLAYLIST_SONG]: DragTarget.SONG,
    [LibraryItem.QUEUE_SONG]: DragTarget.QUEUE_SONG,
    [LibraryItem.SONG]: DragTarget.SONG,
};
export var DragOperation;
(function (DragOperation) {
    DragOperation["ADD"] = "add";
    DragOperation["REORDER"] = "reorder";
})(DragOperation || (DragOperation = {}));
export const dndUtils = {
    dropType: (args) => {
        const { data } = args;
        return data.type;
    },
    generateDragData: (args, metadata) => {
        return {
            id: args.id,
            item: args.item,
            itemType: args.itemType,
            metadata,
            operation: args.operation,
            type: args.type,
        };
    },
    isDropTarget: (target, types) => {
        return types.includes(target);
    },
    reorderById: (args) => {
        const { edge, idFrom, idTo, list } = args;
        const indexFrom = list.indexOf(idFrom);
        const indexTo = list.indexOf(idTo);
        // If dragging to the same position, do nothing
        if (indexFrom === indexTo) {
            return list;
        }
        let newIndex;
        if (edge === 'bottom') {
            newIndex = indexFrom > indexTo ? indexTo + 1 : indexTo;
        }
        else if (edge === 'top' || edge === null) {
            newIndex = indexTo;
        }
        else if (edge === 'left' && indexTo > indexFrom) {
            return list;
        }
        else if (edge === 'right' && indexTo < indexFrom) {
            return list;
        }
        else {
            newIndex = indexTo;
        }
        if (newIndex === indexFrom) {
            return list;
        }
        return dndUtils.reorderByIndex({ index: indexFrom, list, newIndex });
    },
    reorderByIndex: (args) => {
        const { index, list, newIndex } = args;
        const newList = [...list];
        newList.splice(newIndex, 0, newList.splice(index, 1)[0]);
        return newList;
    },
};

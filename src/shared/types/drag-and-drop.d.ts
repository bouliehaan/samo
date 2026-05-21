import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { LibraryItem } from '/@/shared/types/domain-types';
export declare enum DragTarget {
    ALBUM = "album",
    ALBUM_ARTIST = "albumArtist",
    ARTIST = "artist",
    FOLDER = "folder",
    GENERIC = "generic",
    GENRE = "genre",
    GRID_ROW = "gridRow",
    PLAYLIST = "playlist",
    QUEUE_SONG = "queueSong",
    SONG = "song",
    TABLE_COLUMN = "tableColumn"
}
export declare const DragTargetMap: {
    album: DragTarget;
    albumArtist: DragTarget;
    artist: DragTarget;
    folder: DragTarget;
    genre: DragTarget;
    playlist: DragTarget;
    playlistSong: DragTarget;
    queueSong: DragTarget;
    song: DragTarget;
};
export declare enum DragOperation {
    ADD = "add",
    REORDER = "reorder"
}
export interface AlbumDragMetadata {
    image: string;
    title: string;
}
export interface DragData<TDataType = unknown, T extends Record<string, unknown> = Record<string, unknown>> {
    id: string[];
    item?: TDataType[];
    itemType?: LibraryItem;
    metadata?: T;
    operation?: DragOperation[];
    type: DragTarget;
}
export declare const dndUtils: {
    dropType: (args: {
        data: DragData;
    }) => DragTarget;
    generateDragData: <TDataType, T extends Record<string, unknown> = Record<string, unknown>>(args: {
        id: string[];
        item?: TDataType[];
        itemType?: LibraryItem;
        operation?: DragOperation[];
        type: DragTarget | string;
    }, metadata?: T) => {
        id: string[];
        item: TDataType[] | undefined;
        itemType: LibraryItem | undefined;
        metadata: T | undefined;
        operation: DragOperation[] | undefined;
        type: string;
    };
    isDropTarget: (target: DragTarget, types: DragTarget[]) => boolean;
    reorderById: (args: {
        edge: Edge | null;
        idFrom: string;
        idTo: string;
        list: string[];
    }) => string[];
    reorderByIndex: (args: {
        index: number;
        list: string[];
        newIndex: number;
    }) => string[];
};

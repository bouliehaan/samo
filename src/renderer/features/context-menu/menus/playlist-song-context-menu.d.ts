import { LibraryItem, Song } from '/@/shared/types/domain-types';
interface PlaylistSongContextMenuProps {
    items: Song[];
    type: LibraryItem.PLAYLIST_SONG;
}
export declare const PlaylistSongContextMenu: ({ items, type }: PlaylistSongContextMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

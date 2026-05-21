import { LibraryItem, Playlist } from '/@/shared/types/domain-types';
interface PlaylistContextMenuProps {
    items: Playlist[];
    type: LibraryItem.PLAYLIST;
}
export declare const PlaylistContextMenu: ({ items, type }: PlaylistContextMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

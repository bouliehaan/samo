import { Album, LibraryItem } from '/@/shared/types/domain-types';
interface AlbumContextMenuProps {
    items: Album[];
    type: LibraryItem.ALBUM;
}
export declare const AlbumContextMenu: ({ items, type }: AlbumContextMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

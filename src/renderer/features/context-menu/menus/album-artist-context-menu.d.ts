import { AlbumArtist, LibraryItem } from '/@/shared/types/domain-types';
interface AlbumArtistContextMenuProps {
    items: AlbumArtist[];
    type: LibraryItem.ALBUM_ARTIST;
}
export declare const AlbumArtistContextMenu: ({ items, type }: AlbumArtistContextMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

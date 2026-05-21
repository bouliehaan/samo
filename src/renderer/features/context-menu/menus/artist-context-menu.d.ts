import { Artist, LibraryItem } from '/@/shared/types/domain-types';
interface ArtistContextMenuProps {
    items: Artist[];
    type: LibraryItem.ARTIST;
}
export declare const ArtistContextMenu: ({ items, type }: ArtistContextMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

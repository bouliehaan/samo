import { Genre, LibraryItem } from '/@/shared/types/domain-types';
interface GenreContextMenuProps {
    items: Genre[];
    type: LibraryItem.GENRE;
}
export declare const GenreContextMenu: ({ items, type }: GenreContextMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

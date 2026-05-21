import { Folder, LibraryItem } from '/@/shared/types/domain-types';
interface FolderContextMenuProps {
    items: Folder[];
    type: LibraryItem.FOLDER;
}
export declare const FolderContextMenu: ({ items, type }: FolderContextMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

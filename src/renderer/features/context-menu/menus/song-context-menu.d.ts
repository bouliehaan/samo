import { LibraryItem, Song } from '/@/shared/types/domain-types';
interface SongContextMenuProps {
    items: Song[];
    recentItemKey?: string;
    type: LibraryItem.SONG;
}
export declare const SongContextMenu: ({ items, recentItemKey, type }: SongContextMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

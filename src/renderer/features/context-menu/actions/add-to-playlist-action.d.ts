import { LibraryItem } from '/@/shared/types/domain-types';
interface AddToPlaylistActionProps {
    items: string[];
    itemType: LibraryItem;
}
export declare const AddToPlaylistAction: ({ items, itemType }: AddToPlaylistActionProps) => import("react/jsx-runtime").JSX.Element | null;
export {};

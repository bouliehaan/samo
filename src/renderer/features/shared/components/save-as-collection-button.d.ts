import { LibraryItem } from '/@/shared/types/domain-types';
interface SaveAsCollectionButtonProps {
    fullWidth?: boolean;
    itemType: LibraryItem.ALBUM | LibraryItem.SONG;
}
export declare const SaveAsCollectionButton: ({ fullWidth, itemType }: SaveAsCollectionButtonProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { LibraryItem } from '/@/shared/types/domain-types';
interface ContextMenuPreviewProps {
    items: unknown[];
    itemType?: LibraryItem;
}
export declare const ContextMenuPreview: {
    ({ items, itemType }: ContextMenuPreviewProps): import("react/jsx-runtime").JSX.Element | null;
    displayName: string;
};
export {};

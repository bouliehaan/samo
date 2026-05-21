import { ExplicitStatus, LibraryItem, Song } from '/@/shared/types/domain-types';
interface LibraryCommandItemProps {
    disabled?: boolean;
    explicitStatus?: ExplicitStatus | null;
    id: string;
    imageId: null | string;
    imageUrl: null | string;
    isHighlighted?: boolean;
    itemType: LibraryItem;
    song?: Song;
    subtitle?: string;
    title?: string;
}
export declare const LibraryCommandItem: ({ disabled, explicitStatus, id, imageId, imageUrl, isHighlighted, itemType, song, subtitle, title, }: LibraryCommandItemProps) => import("react/jsx-runtime").JSX.Element;
export {};

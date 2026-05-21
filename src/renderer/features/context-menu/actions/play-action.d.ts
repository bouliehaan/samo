import { LibraryItem, Song } from '/@/shared/types/domain-types';
interface PlayActionProps {
    allowShuffle?: boolean;
    ids: string[];
    itemType: LibraryItem;
    onPlay?: () => void;
    songs?: Song[];
}
export declare const PlayAction: ({ allowShuffle, ids, itemType, onPlay, songs, }: PlayActionProps) => import("react/jsx-runtime").JSX.Element | null;
export {};

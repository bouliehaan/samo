import { MouseEvent } from 'react';
import { QueueSong } from '/@/shared/types/domain-types';
interface MobileFullscreenPlayerMetadataProps {
    currentSong?: QueueSong;
    onToggleFavorite: (e: MouseEvent<HTMLButtonElement>) => void;
    radioArtist?: string;
    radioStationName?: string;
    radioTitle?: string;
}
export declare const MobileFullscreenPlayerMetadata: import("react").MemoExoticComponent<({ currentSong, onToggleFavorite, radioArtist, radioStationName, radioTitle, }: MobileFullscreenPlayerMetadataProps) => import("react/jsx-runtime").JSX.Element>;
export {};

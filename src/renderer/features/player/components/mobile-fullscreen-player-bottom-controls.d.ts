import { MouseEvent } from 'react';
interface MobileFullscreenPlayerBottomControlsProps {
    isLyricsActive: boolean;
    isQueueActive: boolean;
    onToggleContextMenu: (e: MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
    onToggleLyrics: () => void;
    onToggleQueue: () => void;
}
export declare const MobileFullscreenPlayerBottomControls: import("react").MemoExoticComponent<({ isLyricsActive, isQueueActive, onToggleContextMenu, onToggleLyrics, onToggleQueue, }: MobileFullscreenPlayerBottomControlsProps) => import("react/jsx-runtime").JSX.Element>;
export {};

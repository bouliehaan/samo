import { QueueSong } from '/@/shared/types/domain-types';
interface MobileFullscreenPlayerHeaderProps {
    currentSong?: QueueSong;
    isPageHovered: boolean;
    onClose: () => void;
}
export declare const MobileFullscreenPlayerHeader: import("react").MemoExoticComponent<({ isPageHovered, onClose }: MobileFullscreenPlayerHeaderProps) => import("react/jsx-runtime").JSX.Element>;
export {};

import { Play } from '/@/shared/types/types';
export declare const LONG_PRESS_PLAY_BEHAVIOR: {
    last: Play;
    next: Play;
    now: Play;
};
export declare const PlayTooltip: ({ children, disabled, showShuffleHint, type, }: {
    children: React.ReactNode;
    disabled?: boolean;
    showShuffleHint?: boolean;
    type: Play;
}) => import("react/jsx-runtime").JSX.Element;
interface PlayButtonGroupPopoverProps extends PlayButtonGroupProps {
    onClose?: () => void;
    position?: 'bottom' | 'left' | 'right' | 'top';
    triggerRef?: React.RefObject<HTMLElement | null>;
}
interface PlayButtonGroupProps {
    allowShuffle?: boolean;
    loading?: boolean | Play;
    onPlay: (type: Play) => void;
}
export declare const PlayButtonGroup: ({ allowShuffle, loading, onPlay }: PlayButtonGroupProps) => import("react/jsx-runtime").JSX.Element;
export declare const PlayButtonGroupPopover: ({ allowShuffle, loading, onClose, onPlay, position, triggerRef, }: PlayButtonGroupPopoverProps) => import("react/jsx-runtime").JSX.Element;
export {};

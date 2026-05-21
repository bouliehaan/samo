import type { QueueSong } from '/@/shared/types/domain-types';
type AudioPathBadgeProps = {
    compact?: boolean;
    inline?: boolean;
    mode?: 'detail' | 'playerbar';
    song?: QueueSong;
};
export declare const AudioPathBadge: ({ compact, inline, mode, song, }: AudioPathBadgeProps) => import("react/jsx-runtime").JSX.Element | null;
export {};

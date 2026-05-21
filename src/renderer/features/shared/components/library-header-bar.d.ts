import { ReactNode } from 'react';
import { type MusicPlaybackContext } from '/@/renderer/store';
import { BadgeProps } from '/@/shared/components/badge/badge';
import { LibraryItem, Song } from '/@/shared/types/domain-types';
interface LibraryHeaderBarProps {
    children: ReactNode;
    ignoreMaxWidth?: boolean;
}
interface HeaderPlayButtonProps {
    allowShuffle?: boolean;
    className?: string;
    /**
     * Explicit playback context to attach when starting playback. Only used by the
     * `songs={...}` path — `ids`/`listQuery` paths derive their own context inside
     * `addToQueueByFetch` from a single ALBUM/PLAYLIST id. Pass this when you have the
     * full song array of an album/playlist already in hand (e.g. the collapsed playlist
     * detail header).
     */
    context?: MusicPlaybackContext;
    ids?: string[];
    itemType: LibraryItem;
    listQuery?: Record<string, any>;
    onBeforePlay?: () => void;
    songs?: Song[];
    variant?: 'default' | 'filled';
}
interface TitleProps {
    children: ReactNode;
    order?: number;
}
interface HeaderBadgeProps extends BadgeProps {
    isLoading?: boolean;
}
export declare const LibraryHeaderBar: import("react").NamedExoticComponent<LibraryHeaderBarProps> & {
    readonly type: ({ children, ignoreMaxWidth }: LibraryHeaderBarProps) => import("react/jsx-runtime").JSX.Element;
} & {
    Badge: ({ children, isLoading, ...props }: HeaderBadgeProps) => import("react/jsx-runtime").JSX.Element;
    PlayButton: ({ allowShuffle, className, context, ids, itemType, listQuery, onBeforePlay, songs, variant, ...props }: HeaderPlayButtonProps) => import("react/jsx-runtime").JSX.Element;
    Title: ({ children, order }: TitleProps) => import("react/jsx-runtime").JSX.Element;
};
export {};

import { ReactElement } from 'react';
import { Song } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
interface AlbumGroupHeaderProps {
    groupRowCount?: number;
    onPlay?: (playType: Play) => void;
    size?: 'compact' | 'large' | 'normal';
    song: Song | undefined;
}
export declare const AlbumGroupHeader: ({ groupRowCount, onPlay, size, song, }: AlbumGroupHeaderProps) => ReactElement;
export {};

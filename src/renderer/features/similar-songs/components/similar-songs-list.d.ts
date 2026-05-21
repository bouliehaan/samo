import { Song } from '/@/shared/types/domain-types';
export type SimilarSongsListProps = {
    count?: number;
    fullScreen?: boolean;
    song: Song;
};
export declare const SimilarSongsList: ({ count, song }: SimilarSongsListProps) => import("react/jsx-runtime").JSX.Element;

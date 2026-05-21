import { PlaylistSongListQuery, PlaylistSongListResponse, Song } from '/@/shared/types/domain-types';
export declare const PlaylistDetailSongListContent: () => import("react/jsx-runtime").JSX.Element;
export type OverridePlaylistSongListQuery = Omit<Partial<PlaylistSongListQuery>, 'id'>;
interface PlaylistDetailSongListViewProps {
    data: PlaylistSongListResponse;
    items?: Song[];
}
export declare const PlaylistDetailSongListView: ({ data, items }: PlaylistDetailSongListViewProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const PlaylistDetailSongListEdit: ({ data }: {
    data: PlaylistSongListResponse;
}) => import("react/jsx-runtime").JSX.Element | null;
export {};

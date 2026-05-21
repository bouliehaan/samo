import { PlaylistSongListResponse, Song } from '/@/shared/types/domain-types';
export declare function applyClientSideSongFilters(songs: Song[], query: Record<string, unknown>): Song[];
export declare function usePlaylistTrackList(data: PlaylistSongListResponse | undefined): {
    sortedAndFilteredSongs: Song[];
    totalCount: number;
};

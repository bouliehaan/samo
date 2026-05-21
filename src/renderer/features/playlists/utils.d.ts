import { Album, Song } from '/@/shared/types/domain-types';
import { QueryBuilderGroup } from '/@/shared/types/types';
export type PlaylistAlbumRow = Album & {
    _playlistSongs?: Song[];
};
export declare function playlistSongsToAlbums(songs: Song[]): PlaylistAlbumRow[];
export declare const parseQueryBuilderChildren: (groups: QueryBuilderGroup[], data: any[]) => any[];
export declare const convertQueryGroupToNDQuery: (filter: QueryBuilderGroup) => {
    [x: string]: any[];
};
export declare const convertNDQueryToQueryGroup: (query: Record<string, any>) => QueryBuilderGroup;

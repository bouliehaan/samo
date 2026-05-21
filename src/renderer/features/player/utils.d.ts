import { QueryClient } from '@tanstack/react-query';
import { PlayerFilter } from '/@/renderer/store';
import { PlaylistSongListQueryClientSide, Song, SongListQuery, SongListResponse } from '/@/shared/types/domain-types';
export declare const getPlaylistSongsById: (args: {
    id: string;
    query?: Partial<PlaylistSongListQueryClientSide>;
    queryClient: QueryClient;
    serverId: string;
}) => Promise<SongListResponse>;
export declare const getAlbumSongsById: (args: {
    id: string[];
    orderByIds?: boolean;
    query?: Partial<SongListQuery>;
    queryClient: QueryClient;
    serverId: string;
}) => Promise<SongListResponse>;
export declare const getGenreSongsById: (args: {
    id: string[];
    orderByIds?: boolean;
    query?: Partial<SongListQuery>;
    queryClient: QueryClient;
    serverId: string;
}) => Promise<SongListResponse>;
export declare const getAlbumArtistSongsById: (args: {
    id: string[];
    orderByIds?: boolean;
    query?: Partial<SongListQuery>;
    queryClient: QueryClient;
    serverId: string;
}) => Promise<SongListResponse>;
export declare const getArtistSongsById: (args: {
    id: string[];
    query?: Partial<SongListQuery>;
    queryClient: QueryClient;
    serverId: string;
}) => Promise<SongListResponse>;
export declare const getSongsByQuery: (args: {
    query?: Partial<SongListQuery>;
    queryClient: QueryClient;
    serverId: string;
}) => Promise<SongListResponse>;
export declare const getSongsByFolder: (args: {
    id: string[];
    orderByIds?: boolean;
    query?: Partial<SongListQuery>;
    queryClient: QueryClient;
    serverId: string;
}) => Promise<SongListResponse>;
export declare const getSongById: (args: {
    id: string;
    queryClient: QueryClient;
    serverId: string;
}) => Promise<SongListResponse>;
export declare const filterSongsByPlayerFilters: (songs: Song[], filters: PlayerFilter[]) => Song[];
export declare const getPlayerFiltersAndFilterSongs: (songs: Song[]) => Song[];

import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { ListCountQuery, PlaylistDetailQuery, PlaylistListQuery, PlaylistSongListQuery } from '/@/shared/types/domain-types';
export declare const playlistsQueries: {
    detail: (args: QueryHookArgs<PlaylistDetailQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").Playlist, Error, import("/@/shared/types/domain-types").Playlist, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").Playlist, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").Playlist;
            [dataTagErrorSymbol]: Error;
        };
    };
    list: (args: QueryHookArgs<PlaylistListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").PlaylistListResponse, Error, import("/@/shared/types/domain-types").PlaylistListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").PlaylistListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").PlaylistListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    listCount: (args: QueryHookArgs<ListCountQuery<PlaylistListQuery>>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<number, Error, number, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<number, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: number;
            [dataTagErrorSymbol]: Error;
        };
    };
    songList: (args: QueryHookArgs<PlaylistSongListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").SongListResponse, Error, import("/@/shared/types/domain-types").SongListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").SongListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").SongListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
};

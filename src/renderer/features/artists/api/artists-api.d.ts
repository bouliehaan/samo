import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { AlbumArtistDetailQuery, AlbumArtistInfoQuery, AlbumArtistListQuery, ArtistListQuery, ListCountQuery, TopSongListQuery } from '/@/shared/types/domain-types';
export declare const artistsQueries: {
    albumArtistDetail: (args: QueryHookArgs<AlbumArtistDetailQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").AlbumArtistDetailResponse, Error, import("/@/shared/types/domain-types").AlbumArtistDetailResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").AlbumArtistDetailResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").AlbumArtistDetailResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    albumArtistInfo: (args: QueryHookArgs<AlbumArtistInfoQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").AlbumArtistInfoResponse | null, Error, import("/@/shared/types/domain-types").AlbumArtistInfoResponse | null, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").AlbumArtistInfoResponse | null, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").AlbumArtistInfoResponse | null;
            [dataTagErrorSymbol]: Error;
        };
    };
    albumArtistList: (args: QueryHookArgs<AlbumArtistListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").AlbumArtistListResponse, Error, import("/@/shared/types/domain-types").AlbumArtistListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").AlbumArtistListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").AlbumArtistListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    albumArtistListCount: (args: QueryHookArgs<ListCountQuery<AlbumArtistListQuery>>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<number, Error, number, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<number, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: number;
            [dataTagErrorSymbol]: Error;
        };
    };
    artistList: (args: QueryHookArgs<ArtistListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").ArtistListResponse, Error, import("/@/shared/types/domain-types").ArtistListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").ArtistListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").ArtistListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    artistListCount: (args: QueryHookArgs<ListCountQuery<ArtistListQuery>>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<number | ((prev: any) => any), Error, number | ((prev: any) => any), readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<number | ((prev: any) => any), readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: number | ((prev: any) => any);
            [dataTagErrorSymbol]: Error;
        };
    };
    favoriteSongs: (args: QueryHookArgs<{
        artistId: string;
    }>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").SongListResponse, Error, import("/@/shared/types/domain-types").SongListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").SongListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").SongListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    topSongs: (args: QueryHookArgs<TopSongListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").TopSongListResponse, Error, import("/@/shared/types/domain-types").TopSongListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").TopSongListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").TopSongListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
};

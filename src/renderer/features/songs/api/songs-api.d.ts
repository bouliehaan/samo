import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { AlbumRadioQuery, ArtistRadioQuery, GetQueueQuery, ListCountQuery, RandomSongListQuery, SimilarSongsQuery, SongListQuery } from '/@/shared/types/domain-types';
export declare const songsQueries: {
    albumRadio: (args: QueryHookArgs<AlbumRadioQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").Song[], Error, import("/@/shared/types/domain-types").Song[], readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").Song[], readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").Song[];
            [dataTagErrorSymbol]: Error;
        };
    };
    artistRadio: (args: QueryHookArgs<ArtistRadioQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").Song[], Error, import("/@/shared/types/domain-types").Song[], readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").Song[], readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").Song[];
            [dataTagErrorSymbol]: Error;
        };
    };
    getQueue: (args: QueryHookArgs<GetQueueQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").GetQueueResponse, Error, import("/@/shared/types/domain-types").GetQueueResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").GetQueueResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").GetQueueResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    list: (args: QueryHookArgs<SongListQuery>, imageSize?: number) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").SongListResponse, Error, import("/@/shared/types/domain-types").SongListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").SongListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").SongListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    listCount: (args: QueryHookArgs<ListCountQuery<SongListQuery>>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<number, Error, number, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<number, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: number;
            [dataTagErrorSymbol]: Error;
        };
    };
    random: (args: QueryHookArgs<RandomSongListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").SongListResponse, Error, import("/@/shared/types/domain-types").SongListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").SongListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").SongListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    similar: (args: QueryHookArgs<SimilarSongsQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").Song[], Error, import("/@/shared/types/domain-types").Song[], readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").Song[], readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").Song[];
            [dataTagErrorSymbol]: Error;
        };
    };
};

import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { SearchQuery, SearchResponse } from '/@/shared/types/domain-types';
export declare const searchQueries: {
    search: (args: QueryHookArgs<SearchQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<SearchResponse, Error, SearchResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<SearchResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: SearchResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    searchAlbumArtistsInfinite: (args: {
        enabled?: boolean;
        searchTerm: string;
        serverId: string | undefined;
    }) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseInfiniteQueryOptions<SearchResponse, Error, import("@tanstack/query-core").InfiniteData<SearchResponse, unknown>, readonly unknown[], number>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<SearchResponse, readonly unknown[], number> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("@tanstack/query-core").InfiniteData<SearchResponse, unknown>;
            [dataTagErrorSymbol]: Error;
        };
    };
    searchAlbumsInfinite: (args: {
        enabled?: boolean;
        searchTerm: string;
        serverId: string | undefined;
    }) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseInfiniteQueryOptions<SearchResponse, Error, import("@tanstack/query-core").InfiniteData<SearchResponse, unknown>, readonly unknown[], number>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<SearchResponse, readonly unknown[], number> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("@tanstack/query-core").InfiniteData<SearchResponse, unknown>;
            [dataTagErrorSymbol]: Error;
        };
    };
    searchSongsInfinite: (args: {
        enabled?: boolean;
        searchTerm: string;
        serverId: string | undefined;
    }) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseInfiniteQueryOptions<SearchResponse, Error, import("@tanstack/query-core").InfiniteData<SearchResponse, unknown>, readonly unknown[], number>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<SearchResponse, readonly unknown[], number> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("@tanstack/query-core").InfiniteData<SearchResponse, unknown>;
            [dataTagErrorSymbol]: Error;
        };
    };
};

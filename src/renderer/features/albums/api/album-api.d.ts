import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { AlbumDetailQuery, AlbumListQuery, ListCountQuery } from '/@/shared/types/domain-types';
export declare const albumQueries: {
    detail: (args: QueryHookArgs<AlbumDetailQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").Album, Error, import("/@/shared/types/domain-types").Album, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").Album, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").Album;
            [dataTagErrorSymbol]: Error;
        };
    };
    list: (args: QueryHookArgs<AlbumListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").AlbumListResponse, Error, import("/@/shared/types/domain-types").AlbumListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").AlbumListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").AlbumListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    listCount: (args: QueryHookArgs<ListCountQuery<AlbumListQuery>>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<number, Error, number, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<number, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: number;
            [dataTagErrorSymbol]: Error;
        };
    };
};

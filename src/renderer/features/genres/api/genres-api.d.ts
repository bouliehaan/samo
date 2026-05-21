import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { GenreListQuery, ListCountQuery } from '/@/shared/types/domain-types';
export declare const genresQueries: {
    list: (args: QueryHookArgs<GenreListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").GenreListResponse, Error, import("/@/shared/types/domain-types").GenreListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").GenreListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").GenreListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    listCount: (args: QueryHookArgs<ListCountQuery<GenreListQuery>>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<number | ((prev: any) => any), Error, number | ((prev: any) => any), readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<number | ((prev: any) => any), readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: number | ((prev: any) => any);
            [dataTagErrorSymbol]: Error;
        };
    };
};
export declare const useGenreList: () => import("@tanstack/react-query").UseSuspenseQueryResult<import("/@/shared/types/domain-types").GenreListResponse, Error>;

import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { AlbumListQuery } from '/@/shared/types/domain-types';
export declare const homeQueries: {
    recentlyPlayed: (args: QueryHookArgs<Partial<AlbumListQuery>>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").AlbumListResponse, Error, import("/@/shared/types/domain-types").AlbumListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").AlbumListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").AlbumListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
};

import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { MusicFolderListQuery, TagListQuery, UserListQuery } from '/@/shared/types/domain-types';
export declare const sharedQueries: {
    musicFolders: (args: QueryHookArgs<MusicFolderListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").MusicFolderListResponse, Error, import("/@/shared/types/domain-types").MusicFolderListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").MusicFolderListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").MusicFolderListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    roles: (args: QueryHookArgs<object>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<(string | {
        label: string;
        value: string;
    })[], Error, (string | {
        label: string;
        value: string;
    })[], readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<(string | {
            label: string;
            value: string;
        })[], readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: (string | {
                label: string;
                value: string;
            })[];
            [dataTagErrorSymbol]: Error;
        };
    };
    tagList: (args: QueryHookArgs<TagListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").TagListResponse, Error, import("/@/shared/types/domain-types").TagListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").TagListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").TagListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
    users: (args: QueryHookArgs<UserListQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").UserListResponse, Error, import("/@/shared/types/domain-types").UserListResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").UserListResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").UserListResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
};

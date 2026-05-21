import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { FolderQuery } from '/@/shared/types/domain-types';
export declare const folderQueries: {
    folder: (args: QueryHookArgs<FolderQuery>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("/@/shared/types/domain-types").Folder, Error, import("/@/shared/types/domain-types").Folder, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("/@/shared/types/domain-types").Folder, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("/@/shared/types/domain-types").Folder;
            [dataTagErrorSymbol]: Error;
        };
    };
};

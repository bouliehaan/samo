import { QueryHookArgs } from '/@/renderer/lib/react-query';
export declare const radioQueries: {
    list: (args: QueryHookArgs<void>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<import("../../../../shared/types/domain-types").GetInternetRadioStationsResponse, Error, import("../../../../shared/types/domain-types").GetInternetRadioStationsResponse, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<import("../../../../shared/types/domain-types").GetInternetRadioStationsResponse, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: import("../../../../shared/types/domain-types").GetInternetRadioStationsResponse;
            [dataTagErrorSymbol]: Error;
        };
    };
};

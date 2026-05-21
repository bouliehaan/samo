import type { QueryOptions, UseInfiniteQueryOptions, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
export declare const queryClient: QueryClient;
export type InfiniteQueryHookArgs<T> = {
    options?: UseInfiniteQueryOptions;
    query: T;
    serverId: string | undefined;
};
export type MutationHookArgs = {
    options?: MutationOptions;
};
export type MutationOptions = {
    mutationKey: UseMutationOptions['mutationKey'];
    onError?: (err: any) => void;
    onSettled?: any;
    onSuccess?: any;
    retry?: UseQueryOptions['retry'];
    retryDelay?: UseQueryOptions['retryDelay'];
    useErrorBoundary?: boolean;
};
export type QueryHookArgs<T> = {
    options?: UseQueryHookOptions;
    query: T;
    serverId: string;
};
type UseQueryHookOptions = {
    enabled?: boolean;
    gcTime?: QueryOptions['gcTime'];
    meta?: UseQueryOptions['meta'];
    networkMode?: UseQueryOptions['networkMode'];
    notifyOnChangeProps?: UseQueryOptions['notifyOnChangeProps'];
    placeholderData?: (prev: any) => any;
    queryKey?: UseQueryOptions['queryKey'];
    queryKeyHashFn?: UseQueryOptions['queryKeyHashFn'];
    refetchInterval?: number;
    refetchIntervalInBackground?: UseQueryOptions['refetchIntervalInBackground'];
    refetchOnMount?: boolean;
    refetchOnReconnect?: boolean;
    refetchOnWindowFocus?: boolean;
    retry?: UseQueryOptions['retry'];
    retryDelay?: UseQueryOptions['retryDelay'];
    retryOnMount?: UseQueryOptions['retryOnMount'];
    staleTime?: number;
    structuralSharing?: UseQueryOptions['structuralSharing'];
    subscribed?: UseQueryOptions['subscribed'];
    throwOnError?: boolean;
};
export {};

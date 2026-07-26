import type {
    DefaultOptions,
    QueryOptions,
    UseInfiniteQueryOptions,
    UseMutationOptions,
    UseQueryOptions,
} from '@tanstack/react-query';

import { QueryCache, QueryClient } from '@tanstack/react-query';

import { isAuthFailure } from '/@/shared/api/samo/samo-http-errors';
import { toast } from '/@/shared/components/toast/toast';
import { logFn } from '/@/shared/utils/logger';

// A dead session fails every in-flight query at once. Toast once for the whole
// burst instead of once per query, and re-arm after a quiet period so a later
// session failure is still surfaced.
const AUTH_TOAST_COOLDOWN_MS = 10_000;
let lastAuthToastAt = 0;

const queryCache = new QueryCache({
    onError: (error: any, query) => {
        const message = error instanceof Error ? error.message : String(error);

        // Log unconditionally. This used to be gated on the query having prior
        // data, so a failure on cold load produced no log and no toast — the
        // section just rendered empty with no indication anything had gone wrong.
        logFn.error(message, { meta: { error: error } });

        if (isAuthFailure(error)) {
            const now = Date.now();
            if (now - lastAuthToastAt > AUTH_TOAST_COOLDOWN_MS) {
                lastAuthToastAt = now;
                toast.show({
                    message: 'Your session expired. Reconnecting to the server…',
                    type: 'error',
                });
            }
            return;
        }

        if (query.state.data !== undefined) {
            toast.show({ message, type: 'error' });
        }
    },
});

// Auth failures are not transient: retrying a 401/403 can't succeed, it just
// multiplies a dead session into a request storm (every failing query retried
// with backoff) while the re-authentication path is what actually recovers it.
// Transport failures still retry.
const retryUnlessAuthFailure = (failureCount: number, error: unknown, maxRetries: number) => {
    if (isAuthFailure(error)) {
        return false;
    }

    return failureCount < maxRetries;
};

const queryConfig: DefaultOptions = {
    mutations: {
        retry: (failureCount, error) =>
            process.env.NODE_ENV === 'production' && retryUnlessAuthFailure(failureCount, error, 3),
    },
    queries: {
        gcTime: 1000 * 60 * 60 * 24, // 24 hours — cache survives navigation; persisted to IndexedDB
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
            process.env.NODE_ENV === 'production' && retryUnlessAuthFailure(failureCount, error, 3),
        staleTime: 1000 * 60 * 5, // 5 minutes — show cached data instantly, refetch in background when stale
        throwOnError: (error: any) => {
            return error?.response?.status >= 500;
        },
    },
};

export const queryClient = new QueryClient({
    defaultOptions: queryConfig,
    queryCache,
});

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
    // initialData?: UseQueryOptions['initialData'];
    // initialDataUpdatedAt?: UseQueryOptions['initialDataUpdatedAt'];
    meta?: UseQueryOptions['meta'];
    networkMode?: UseQueryOptions['networkMode'];
    notifyOnChangeProps?: UseQueryOptions['notifyOnChangeProps'];
    placeholderData?: (prev: any) => any;
    // queryFn?: UseQueryOptions['queryFn'];
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
    // select?: UseQueryOptions['select'];
    staleTime?: number;
    structuralSharing?: UseQueryOptions['structuralSharing'];
    subscribed?: UseQueryOptions['subscribed'];
    throwOnError?: boolean;
};

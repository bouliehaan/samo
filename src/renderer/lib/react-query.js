import { logFn } from '/@/renderer/utils/logger';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from '/@/shared/components/toast/toast';
const queryCache = new QueryCache({
    onError: (error, query) => {
        if (query.state.data !== undefined) {
            logFn.error(error instanceof Error ? error.message : String(error), { meta: { error: error } });
            toast.show({ message: `${error.message}`, type: 'error' });
        }
    },
});
const queryConfig = {
    mutations: {
        retry: process.env.NODE_ENV === 'production' ? 3 : false,
    },
    queries: {
        gcTime: 1000 * 60 * 60 * 24, // 24 hours — cache survives navigation; persisted to IndexedDB
        refetchOnWindowFocus: false,
        retry: process.env.NODE_ENV === 'production',
        staleTime: 1000 * 60 * 5, // 5 minutes — show cached data instantly, refetch in background when stale
        throwOnError: (error) => {
            return error?.response?.status >= 500;
        },
    },
};
export const queryClient = new QueryClient({
    defaultOptions: queryConfig,
    queryCache,
});

import type { QueryClient } from '@tanstack/react-query';

/**
 * Whether a query key sits under a list's key namespace — e.g. every paged
 * `[serverId, 'playlists', 'list', filter, pagination]` under
 * `[serverId, 'playlists', 'list']`.
 */
export const matchesListKeyPrefix = (
    listKeyPrefix: readonly unknown[],
    queryKey: readonly unknown[],
): boolean => listKeyPrefix.every((part, index) => queryKey[index] === part);

/**
 * Run `onInvalidated` once per burst of invalidations touching `listKeyPrefix`.
 *
 * This exists because a list's rows are not held by the queries that fetched
 * them. The infinite loader keeps its own index → item map in a cache entry it
 * writes with setQueryData, and that entry has no fetcher, so react-query can
 * never refresh it: `invalidateQueries()` marks it stale and nothing follows.
 * Watching the page queries the rows actually came from is what closes that
 * gap.
 *
 * `invalidateQueries()` reports every matching query separately — one "sync
 * with server" fires this many times over — so the burst is collapsed onto the
 * next microtask, by which point react-query has finished marking the whole
 * batch and the callback sees a settled cache.
 */
export const watchListQueryInvalidation = (
    queryClient: QueryClient,
    listKeyPrefix: readonly unknown[],
    onInvalidated: () => void,
): (() => void) => {
    let scheduled = false;

    return queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'invalidate') {
            return;
        }

        if (!matchesListKeyPrefix(listKeyPrefix, event.query.queryKey)) {
            return;
        }

        if (scheduled) {
            return;
        }

        scheduled = true;
        queueMicrotask(() => {
            scheduled = false;
            onInvalidated();
        });
    });
};

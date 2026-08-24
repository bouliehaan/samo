import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { matchesListKeyPrefix, watchListQueryInvalidation } from './list-query-invalidation';

const SERVER = 'server-1';
const LIST_PREFIX = [SERVER, 'playlists', 'list'] as const;

/** Let react-query's notify batch and our coalescing microtask both drain. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let queryClient: QueryClient;

beforeEach(() => {
    queryClient = new QueryClient();
});

/** Seed the cache the way the infinite loader does: one entry per fetched page. */
const seedPages = (pages: number) => {
    for (let page = 0; page < pages; page += 1) {
        queryClient.setQueryData(
            [...LIST_PREFIX, { sortBy: 'name' }, { limit: 100, startIndex: page * 100 }],
            { items: [] },
        );
    }
};

describe('matchesListKeyPrefix', () => {
    it('matches a paged key under the list namespace', () => {
        expect(
            matchesListKeyPrefix(LIST_PREFIX, [
                SERVER,
                'playlists',
                'list',
                { sortBy: 'name' },
                { startIndex: 0 },
            ]),
        ).toBe(true);
    });

    it('rejects a sibling namespace and another server', () => {
        expect(matchesListKeyPrefix(LIST_PREFIX, [SERVER, 'playlists', 'count'])).toBe(false);
        expect(matchesListKeyPrefix(LIST_PREFIX, ['server-2', 'playlists', 'list'])).toBe(false);
    });

    it('rejects a key shorter than the prefix', () => {
        expect(matchesListKeyPrefix(LIST_PREFIX, [SERVER, 'playlists'])).toBe(false);
    });
});

describe('watchListQueryInvalidation', () => {
    it('fires once for a burst that invalidates every page at once', async () => {
        seedPages(5);
        const onInvalidated = vi.fn();
        watchListQueryInvalidation(queryClient, LIST_PREFIX, onInvalidated);

        await queryClient.invalidateQueries();
        await settle();

        expect(onInvalidated).toHaveBeenCalledTimes(1);
    });

    it('fires again on the next burst once the refetch has landed', async () => {
        seedPages(2);
        // Standing in for the forced refetch: fresh data clears the
        // invalidation, which is what lets the next burst be announced.
        const onInvalidated = vi.fn(() => seedPages(2));
        watchListQueryInvalidation(queryClient, LIST_PREFIX, onInvalidated);

        await queryClient.invalidateQueries();
        await settle();
        await queryClient.invalidateQueries();
        await settle();

        expect(onInvalidated).toHaveBeenCalledTimes(2);
    });

    it('goes quiet on a repeat burst when the refetch never landed', async () => {
        // react-query only announces an invalidation the first time: a query
        // already marked invalidated is invalidated again in silence. So a list
        // whose refetch failed cannot hear the next sync through this path —
        // which is why the sync also broadcasts ITEM_LIST_REFRESH directly.
        seedPages(2);
        const onInvalidated = vi.fn();
        watchListQueryInvalidation(queryClient, LIST_PREFIX, onInvalidated);

        await queryClient.invalidateQueries();
        await settle();
        await queryClient.invalidateQueries();
        await settle();

        expect(onInvalidated).toHaveBeenCalledTimes(1);
    });

    it('fires for a targeted invalidation of the list namespace', async () => {
        seedPages(3);
        const onInvalidated = vi.fn();
        watchListQueryInvalidation(queryClient, LIST_PREFIX, onInvalidated);

        // What add-to-playlist does after the server accepts the write.
        await queryClient.invalidateQueries({ exact: false, queryKey: LIST_PREFIX });
        await settle();

        expect(onInvalidated).toHaveBeenCalledTimes(1);
    });

    it('ignores invalidations that miss the namespace', async () => {
        queryClient.setQueryData([SERVER, 'albums', 'list', {}], { items: [] });
        const onInvalidated = vi.fn();
        watchListQueryInvalidation(queryClient, LIST_PREFIX, onInvalidated);

        await queryClient.invalidateQueries({ queryKey: [SERVER, 'albums'] });
        await settle();

        expect(onInvalidated).not.toHaveBeenCalled();
    });

    it('stops on unsubscribe', async () => {
        seedPages(2);
        const onInvalidated = vi.fn();
        const unsubscribe = watchListQueryInvalidation(queryClient, LIST_PREFIX, onInvalidated);

        unsubscribe();
        await queryClient.invalidateQueries();
        await settle();

        expect(onInvalidated).not.toHaveBeenCalled();
    });

    it('is the only thing that can refresh a setQueryData-only entry', async () => {
        // The bug this exists for. The loader keeps its rows here; the entry has
        // no fetcher, so invalidation marks it stale and leaves the stale rows
        // in place — a playlist's track count never moved.
        const derivedKey = [SERVER, 'item-list-infinite-loader', 'playlist'];
        queryClient.setQueryData(derivedKey, { songCount: 12 });
        seedPages(1);

        await queryClient.invalidateQueries();
        await settle();

        expect(queryClient.getQueryData(derivedKey)).toEqual({ songCount: 12 });

        // With the watcher, the same invalidation is what drives the re-derive.
        watchListQueryInvalidation(queryClient, LIST_PREFIX, () => {
            seedPages(1);
            queryClient.setQueryData(derivedKey, { songCount: 13 });
        });

        seedPages(2);
        await queryClient.invalidateQueries();
        await settle();

        expect(queryClient.getQueryData(derivedKey)).toEqual({ songCount: 13 });
    });
});

import {
    PersistedClient,
    Persister,
    PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { createRoot } from 'react-dom/client';

import { App } from '/@/renderer/app';
import { queryClient } from '/@/renderer/lib/react-query';

function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery') {
    return {
        persistClient: async (client: PersistedClient) => {
            set(idbValidKey, client);
        },
        removeClient: async () => {
            await del(idbValidKey);
        },
        restoreClient: async () => {
            return await get<PersistedClient>(idbValidKey);
        },
    } as Persister;
}

const indexedDbPersister = createIDBPersister('samo');

createRoot(document.getElementById('root')!).render(
    <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
            // samo-v5 drops every stream URL an earlier build persisted.
            buster: 'samo-v5',
            dehydrateOptions: {
                // The item-list loaders keep their rows in a cache entry that
                // has no fetcher; every mount throws that entry away and
                // refetches from the server regardless. Persisting it bought
                // nothing and cost a full re-serialisation of every loaded row
                // into IndexedDB on each page scrolled in.
                //
                // A stream URL carries a stream token that dies 30 minutes after
                // it was minted. Restored on the next visit, it was the first
                // URL useSongUrl saw for that song, and its reuse-prior latch
                // held on to it: every song played in an earlier session 401'd
                // in the web player until site data was cleared.
                shouldDehydrateQuery: (query) =>
                    query.state.status === 'success' &&
                    query.queryKey[1] !== 'item-list-infinite-loader' &&
                    query.queryKey[1] !== 'stream-url',
            },
            hydrateOptions: {
                defaultOptions: {
                    queries: {
                        gcTime: Infinity,
                    },
                },
            },
            maxAge: Infinity,
            persister: indexedDbPersister,
        }}
    >
        <App />
    </PersistQueryClientProvider>,
);

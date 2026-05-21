import { jsx as _jsx } from "react/jsx-runtime";
import { PersistQueryClientProvider, } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { createRoot } from 'react-dom/client';
import { App } from '/@/renderer/app';
import { queryClient } from '/@/renderer/lib/react-query';
function createIDBPersister(idbValidKey = 'reactQuery') {
    return {
        persistClient: async (client) => {
            set(idbValidKey, client);
        },
        removeClient: async () => {
            await del(idbValidKey);
        },
        restoreClient: async () => {
            return await get(idbValidKey);
        },
    };
}
const indexedDbPersister = createIDBPersister('samo');
createRoot(document.getElementById('root')).render(_jsx(PersistQueryClientProvider, { client: queryClient, persistOptions: {
        buster: 'samo-v3',
        dehydrateOptions: {
            shouldDehydrateQuery: (query) => query.state.status === 'success',
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
    }, children: _jsx(App, {}) }));

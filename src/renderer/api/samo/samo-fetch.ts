import { adaptNativeFetch, getFetch, type SamoFetch, type SamoFetchInit } from '@samo/core/server';
import isElectron from 'is-electron';

/**
 * samo API calls from the Electron renderer hit CORS/webSecurity limits when
 * using window.fetch, even though main-process auth works. Route samo HTTP
 * through IPC (Node fetch) in desktop builds, same as authenticate.
 */
export const createSamoFetch = (): SamoFetch => {
    if (isElectron()) {
        return getFetch(
            // `init` is typed to carry a request's own deadline through: the
            // core stamps it on SamoFetchInit, and this adapter is the one
            // place it has to be read back out before the call leaves the
            // renderer.
            adaptNativeFetch(async (url, init?: Pick<SamoFetchInit, 'timeoutMs'> & RequestInit) => {
                // `getFetch` has already stamped X-samo-Client into these —
                // the id the server echoes on catalog-change events, so this
                // window can tell its own writes from another device's.
                const serializedHeaders: Record<string, string> = {};
                if (init?.headers) {
                    new Headers(init.headers).forEach((value, key) => {
                        serializedHeaders[key] = value;
                    });
                }

                // The main process runs its own timeout layer around the
                // real fetch, and it is the one that actually cuts a request
                // off — an abort here never crosses the IPC boundary. So a
                // call's own deadline goes across with it, or the default
                // underneath would decide.
                const result = await window.api.samo.request({
                    body: typeof init?.body === 'string' ? init.body : undefined,
                    headers: serializedHeaders,
                    method: init?.method,
                    timeoutMs: init?.timeoutMs,
                    url,
                });

                return new Response(result.body, {
                    headers: result.headers,
                    status: result.status,
                    statusText: result.statusText,
                });
            }),
        );
    }

    return getFetch(adaptNativeFetch(fetch));
};

export const samoFetch = createSamoFetch();

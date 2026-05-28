import { adaptNativeFetch, getFetch, type SamoFetch } from '@samo/core/server';
import isElectron from 'is-electron';

/**
 * Samo API calls from the Electron renderer hit CORS/webSecurity limits when
 * using window.fetch, even though main-process auth works. Route Samo HTTP
 * through IPC (Node fetch) in desktop builds, same as authenticate.
 */
export const createSamoFetch = (): SamoFetch => {
    if (isElectron()) {
        return getFetch(
            adaptNativeFetch(async (url, init) => {
                const result = await window.api.samo.request({
                    body: typeof init?.body === 'string' ? init.body : undefined,
                    headers: init?.headers as Record<string, string> | undefined,
                    method: init?.method,
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

export type SamoFetch = (url: string, init?: SamoFetchInit) => Promise<SamoFetchResponse>;

export type SamoFetchInit = {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
};

export interface SamoFetchResponse {
    arrayBuffer?: () => Promise<ArrayBuffer>;
    headers?: { get: (name: string) => null | string };
    json: () => Promise<unknown>;
    ok: boolean;
    status: number;
    text?: () => Promise<string>;
}

export const adaptNativeFetch = (
    fetchFn: (url: string, init?: SamoFetchInit) => Promise<Response>,
): SamoFetch => {
    return async (url, init) => {
        const response = await fetchFn(url, init);

        return {
            arrayBuffer: () => response.arrayBuffer(),
            headers: { get: (name) => response.headers.get(name) },
            json: () => response.json(),
            ok: response.ok,
            status: response.status,
            text: () => response.text(),
        };
    };
};

export const getFetch = (fetcher?: SamoFetch): SamoFetch => {
    const globalFetch = (globalThis as { fetch?: SamoFetch }).fetch;
    const resolvedFetch = fetcher ?? globalFetch?.bind(globalThis);

    if (!resolvedFetch) {
        throw new Error('Fetch is not available');
    }

    return resolvedFetch;
};

export const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '');

export const requestJson = async <T>(
    fetcher: SamoFetch,
    url: string,
    init?: SamoFetchInit,
): Promise<T> => {
    const response = await fetcher(url, init);

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }

    return response.json() as Promise<T>;
};

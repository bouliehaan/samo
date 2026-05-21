export type SamoFetch = (url: string, init?: SamoFetchInit) => Promise<SamoFetchResponse>;
export type SamoFetchInit = {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
    signal?: AbortSignal;
};
export interface SamoFetchResponse {
    arrayBuffer?: () => Promise<ArrayBuffer>;
    headers?: {
        get: (name: string) => null | string;
    };
    json: () => Promise<unknown>;
    ok: boolean;
    status: number;
    text?: () => Promise<string>;
}
export declare const DEFAULT_SAMO_REQUEST_TIMEOUT_MS = 30000;
export declare const adaptNativeFetch: (
    fetchFn: (url: string, init?: RequestInit) => Promise<Response>,
) => SamoFetch;
export declare const withRequestTimeout: (
    fetcher: SamoFetch,
    timeoutMs?: number,
) => SamoFetch;
export declare const getFetch: (fetcher?: SamoFetch) => SamoFetch;
export declare const normalizeBaseUrl: (url: string) => string;
export declare const requestJson: <T>(
    fetcher: SamoFetch,
    url: string,
    init?: SamoFetchInit,
) => Promise<T>;

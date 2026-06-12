export type SamoFetch = (url: string, init?: SamoFetchInit) => Promise<SamoFetchResponse>;

export type SamoFetchInit = {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
    signal?: AbortSignal;
};

/** Default per-request timeout for Subsonic / Audiobookshelf REST calls. */
export const DEFAULT_SAMO_REQUEST_TIMEOUT_MS = 30_000;

export interface SamoFetchResponse {
    arrayBuffer?: () => Promise<ArrayBuffer>;
    headers?: { get: (name: string) => null | string };
    json: () => Promise<unknown>;
    ok: boolean;
    status: number;
    text?: () => Promise<string>;
}

export const adaptNativeFetch = (
    fetchFn: (url: string, init?: RequestInit) => Promise<Response>,
): SamoFetch => {
    return async (url, init) => {
        const response = await fetchFn(url, init as RequestInit | undefined);

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

export const withRequestTimeout = (
    fetcher: SamoFetch,
    timeoutMs = DEFAULT_SAMO_REQUEST_TIMEOUT_MS,
): SamoFetch => {
    return async (url, init) => {
        if (init?.signal) {
            return fetcher(url, init);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            return await fetcher(url, { ...init, signal: controller.signal });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timed out after ${timeoutMs}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    };
};

export const getFetch = (
    fetcher?: SamoFetch,
    timeoutMs = DEFAULT_SAMO_REQUEST_TIMEOUT_MS,
): SamoFetch => {
    const globalFetch = (globalThis as { fetch?: SamoFetch }).fetch;
    const resolvedFetch = fetcher ?? globalFetch?.bind(globalThis);

    if (!resolvedFetch) {
        throw new Error('Fetch is not available');
    }

    return withRequestTimeout(resolvedFetch, timeoutMs);
};

export const normalizeBaseUrl = (url: string | null | undefined) =>
    (typeof url === 'string' ? url : '').trim().replace(/\/+$/, '');

export const requestJson = async <T>(
    fetcher: SamoFetch,
    url: string,
    init?: SamoFetchInit,
): Promise<T> => {
    const response = await fetcher(url, init);
    const bodyText = response.text ? await response.text() : '';

    if (!response.ok) {
        const detail = bodyText.trim().slice(0, 200);
        throw new Error(
            detail
                ? `Request failed (${response.status}): ${detail}`
                : `Request failed (${response.status})`,
        );
    }

    if (!bodyText.trim()) {
        throw new Error(`Empty response from ${url}`);
    }

    try {
        return JSON.parse(bodyText) as T;
    } catch {
        const detail = bodyText.trim().slice(0, 200);
        throw new Error(
            detail ? `Invalid JSON response: ${detail}` : `Invalid JSON response from ${url}`,
        );
    }
};

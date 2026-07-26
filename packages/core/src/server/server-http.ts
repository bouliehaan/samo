export type SamoFetch = (url: string, init?: SamoFetchInit) => Promise<SamoFetchResponse>;

export type SamoFetchInit = {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
    signal?: AbortSignal;
};

/** Default per-request timeout for Samo REST calls. */
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

/** One retry, 500ms backoff — matches docs/PERFORMANCE_AND_NETWORK.md's P0. */
const RETRY_DELAY_MS = 500;

const isRetryableTransportError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
        return false;
    }
    // TypeError is how RN/browser fetch surfaces a real connection failure
    // (DNS, refused, dropped mid-request). The timeout message is
    // withRequestTimeout's own AbortError, rethrown with this text below.
    // Neither means the request was invalid — both are worth one retry.
    return error.name === 'TypeError' || error.message.startsWith('Request timed out');
};

/**
 * Retry a single idempotent GET once, with a short backoff, on a transient
 * transport failure (timeout / dropped connection) — never on an HTTP error
 * response (that's a real answer, not a transport problem) and never on a
 * mutation. On a LAN a dropped request almost never happens; over a real
 * internet connection (e.g. through a Cloudflare Tunnel) a single blip is
 * common enough that surfacing it as a hard failure — turning "podcast feed
 * didn't load" into "reload the app" — is worse than the cost of one retry.
 *
 * Steps aside entirely when the caller already supplies an AbortSignal:
 * that caller (e.g. the interactive auth fetcher, or a screen's own
 * request-cancellation token) is already managing its own retry/cancel
 * story, and doubling up would fight it.
 */
const withIdempotentRetry = (fetcher: SamoFetch): SamoFetch => {
    return async (url, init) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (method !== 'GET' || init?.signal) {
            return fetcher(url, init);
        }

        try {
            return await fetcher(url, init);
        } catch (error) {
            if (!isRetryableTransportError(error)) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            return fetcher(url, init);
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

    return withIdempotentRetry(withRequestTimeout(resolvedFetch, timeoutMs));
};

export const normalizeBaseUrl = (url: string | null | undefined) =>
    (typeof url === 'string' ? url : '').trim().replace(/\/+$/, '');

export const requestJson = async <T>(
    fetcher: SamoFetch,
    url: string,
    init?: SamoFetchInit,
): Promise<T> => {
    const response = await fetcher(url, init);

    if (!response.ok) {
        const bodyText = response.text ? await response.text() : '';
        const detail = bodyText.trim().slice(0, 200);
        throw new Error(
            detail
                ? `Request failed (${response.status}): ${detail}`
                : `Request failed (${response.status})`,
        );
    }

    // 204s and other empty bodies are success, not JSON — DELETE endpoints
    // (e.g. playlist delete) answer 204 No Content, and parsing "" used to
    // throw here, so the client reported a failure for a delete that had
    // already succeeded server-side.
    if (response.status === 204) {
        return undefined as T;
    }
    if (response.text) {
        const text = await response.text();
        if (!text.trim()) {
            return undefined as T;
        }
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new Error(`Invalid JSON response from ${url}`);
        }
    }
    try {
        return (await response.json()) as T;
    } catch {
        throw new Error(`Invalid JSON response from ${url}`);
    }
};

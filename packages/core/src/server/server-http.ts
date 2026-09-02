import { getSamoClientId, SAMO_CLIENT_HEADER } from './server-client-id';

export type SamoFetch = (url: string, init?: SamoFetchInit) => Promise<SamoFetchResponse>;

export type SamoFetchInit = {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
    signal?: AbortSignal;
};

/** Default per-request timeout for Samo REST calls. */
export const DEFAULT_SAMO_REQUEST_TIMEOUT_MS = 30_000;

/**
 * An HTTP error response, carrying the status so callers can CLASSIFY it.
 *
 * `requestJson` used to throw a plain Error whose only record of the status was
 * the text "Request failed (401)". That left every caller with two bad options:
 * treat all failures alike, or match on a message. Both were live bugs —
 * `ensureSamoStreamToken` retried a 401 exactly as if it were a dropped
 * connection, hammering the mint endpoint on a session that could not possibly
 * succeed, and nothing anywhere could tell "your credentials are gone" from
 * "the Wi-Fi blipped".
 *
 * The message is byte-identical to what it replaced, so anything that only
 * surfaces `error.message` is unaffected.
 */
export class SamoHttpError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'SamoHttpError';
        this.status = status;
    }
}

/** True for a status that says the CREDENTIALS are the problem, so retrying the
 *  same request cannot help. Kept next to the error it classifies so the two
 *  can never drift apart. */
export const isSamoAuthFailure = (error: unknown): boolean =>
    error instanceof SamoHttpError && (error.status === 401 || error.status === 403);

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

/**
 * Stamp this client's id on every request.
 *
 * The server echoes it back on the catalog-change events a request causes, so
 * the client that made the change can ignore its own notification — it applied
 * that change locally already. Done here rather than at each call site because
 * "every request" is the point: an unstamped write is one the origin cannot
 * recognise, and it then refetches (or on the phone, re-syncs) for something
 * already on screen.
 *
 * A caller's own headers win, so nothing that sets the header explicitly is
 * overridden.
 */
const withClientId = (fetcher: SamoFetch): SamoFetch => {
    return async (url, init) => {
        return fetcher(url, {
            ...init,
            headers: { [SAMO_CLIENT_HEADER]: getSamoClientId(), ...(init?.headers ?? {}) },
        });
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

    return withClientId(withIdempotentRetry(withRequestTimeout(resolvedFetch, timeoutMs)));
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
        throw new SamoHttpError(
            response.status,
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

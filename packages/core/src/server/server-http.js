export const DEFAULT_SAMO_REQUEST_TIMEOUT_MS = 30_000;

export const adaptNativeFetch = (fetchFn) => {
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

export const withRequestTimeout = (fetcher, timeoutMs = DEFAULT_SAMO_REQUEST_TIMEOUT_MS) => {
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

export const getFetch = (fetcher) => {
    const globalFetch = globalThis.fetch;
    const resolvedFetch = fetcher ?? globalFetch?.bind(globalThis);

    if (!resolvedFetch) {
        throw new Error('Fetch is not available');
    }

    return withRequestTimeout(resolvedFetch);
};

export const normalizeBaseUrl = (url) => (typeof url === 'string' ? url : '').trim().replace(/\/+$/, '');

export const requestJson = async (fetcher, url, init) => {
    const response = await fetcher(url, init);

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }

    return response.json();
};

import { adaptNativeFetch, normalizeBaseUrl, requestJson, } from './server-http';
export * from './server-audiobookshelf-types';
const absAuthHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
});
const absUrl = (baseUrl, path) => `${normalizeBaseUrl(baseUrl)}${path}`;
const absRequest = async (fetcher, baseUrl, path, init) => {
    const response = await fetcher(absUrl(baseUrl, path), init);
    if (!response.ok) {
        throw new Error(`Audiobookshelf request failed (${response.status})`);
    }
    return response;
};
export const absLogin = async (fetcher, url, body) => {
    return requestJson(fetcher, absUrl(url, '/login'), {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
};
export const absGetLibraries = async (fetcher, server) => {
    return requestJson(fetcher, absUrl(server.url, '/api/libraries'), {
        headers: absAuthHeaders(server.credential),
        method: 'GET',
    });
};
export const absGetLibraryItems = async (fetcher, server, libraryId) => {
    return requestJson(fetcher, absUrl(server.url, `/api/libraries/${libraryId}/items`), {
        headers: absAuthHeaders(server.credential),
        method: 'GET',
    });
};
export const absGetItem = async (fetcher, server, itemId) => {
    return requestJson(fetcher, absUrl(server.url, `/api/items/${itemId}?expanded=1`), {
        headers: absAuthHeaders(server.credential),
        method: 'GET',
    });
};
export const absPlayItem = async (fetcher, server, itemId, episodeId) => {
    const playPath = episodeId
        ? `/api/items/${itemId}/play/${episodeId}`
        : `/api/items/${itemId}/play`;
    return requestJson(fetcher, absUrl(server.url, playPath), {
        body: JSON.stringify({}),
        headers: {
            ...absAuthHeaders(server.credential),
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });
};
export const absSyncPlaybackSession = async (fetcher, server, sessionId, body) => {
    const response = await absRequest(fetcher, server.url, `/api/session/${encodeURIComponent(sessionId)}/sync`, {
        body: JSON.stringify(body),
        headers: {
            ...absAuthHeaders(server.credential),
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });
    await response.text?.();
};
export const absClosePlaybackSession = async (fetcher, server, sessionId, body) => {
    await absRequest(fetcher, server.url, `/api/session/${encodeURIComponent(sessionId)}/close`, {
        body: JSON.stringify(body),
        headers: {
            ...absAuthHeaders(server.credential),
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });
};
export const absGetItemCoverDataUrl = async (fetcher, server, itemId) => {
    const response = await fetcher(absUrl(server.url, `/api/items/${itemId}/cover`), {
        headers: absAuthHeaders(server.credential),
        method: 'GET',
    });
    if (response.status === 404) {
        return undefined;
    }
    if (!response.ok) {
        throw new Error(`Audiobookshelf cover request failed (${response.status})`);
    }
    const contentType = response.headers?.get('content-type') ?? 'image/jpeg';
    const buffer = await response.arrayBuffer?.();
    if (!buffer) {
        return undefined;
    }
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
};
export const getAbsFetch = (fetcher) => {
    if (fetcher) {
        return fetcher;
    }
    return adaptNativeFetch(globalThis.fetch.bind(globalThis));
};

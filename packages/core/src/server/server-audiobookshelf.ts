import {
    adaptNativeFetch,
    normalizeBaseUrl,
    requestJson,
    type SamoFetch,
    type SamoFetchInit,
} from './server-http';
import {
    type AbsLibrariesResponse,
    type AbsLibraryItem,
    type AbsLibraryItemsResponse,
    type AbsLoginResponse,
    type AbsPlaybackSessionResponse,
    type AbsPlaybackSessionSyncRequest,
    type AbsServer,
} from './server-audiobookshelf-types';

export * from './server-audiobookshelf-types';

const absAuthHeaders = (token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
});

const absUrl = (baseUrl: string, path: string) => `${normalizeBaseUrl(baseUrl)}${path}`;

const absRequest = async (
    fetcher: SamoFetch,
    baseUrl: string,
    path: string,
    init?: SamoFetchInit,
) => {
    const response = await fetcher(absUrl(baseUrl, path), init);

    if (!response.ok) {
        throw new Error(`Audiobookshelf request failed (${response.status})`);
    }

    return response;
};

export const absLogin = async (
    fetcher: SamoFetch,
    url: string,
    body: { password: string; username: string },
): Promise<AbsLoginResponse> => {
    return requestJson<AbsLoginResponse>(fetcher, absUrl(url, '/login'), {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
};

export const absGetLibraries = async (
    fetcher: SamoFetch,
    server: AbsServer,
): Promise<AbsLibrariesResponse> => {
    return requestJson<AbsLibrariesResponse>(fetcher, absUrl(server.url, '/api/libraries'), {
        headers: absAuthHeaders(server.credential),
        method: 'GET',
    });
};

export const absGetLibraryItems = async (
    fetcher: SamoFetch,
    server: AbsServer,
    libraryId: string,
): Promise<AbsLibraryItemsResponse> => {
    return requestJson<AbsLibraryItemsResponse>(
        fetcher,
        absUrl(server.url, `/api/libraries/${libraryId}/items`),
        {
            headers: absAuthHeaders(server.credential),
            method: 'GET',
        },
    );
};

export const absGetItem = async (
    fetcher: SamoFetch,
    server: AbsServer,
    itemId: string,
): Promise<AbsLibraryItem> => {
    return requestJson<AbsLibraryItem>(
        fetcher,
        absUrl(server.url, `/api/items/${itemId}?expanded=1`),
        {
            headers: absAuthHeaders(server.credential),
            method: 'GET',
        },
    );
};

export const absPlayItem = async (
    fetcher: SamoFetch,
    server: AbsServer,
    itemId: string,
    episodeId?: string,
): Promise<AbsPlaybackSessionResponse> => {
    const playPath = episodeId
        ? `/api/items/${itemId}/play/${episodeId}`
        : `/api/items/${itemId}/play`;

    return requestJson<AbsPlaybackSessionResponse>(fetcher, absUrl(server.url, playPath), {
        body: JSON.stringify({}),
        headers: {
            ...absAuthHeaders(server.credential),
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });
};

export const absSyncPlaybackSession = async (
    fetcher: SamoFetch,
    server: AbsServer,
    sessionId: string,
    body: AbsPlaybackSessionSyncRequest,
): Promise<void> => {
    const response = await absRequest(
        fetcher,
        server.url,
        `/api/session/${encodeURIComponent(sessionId)}/sync`,
        {
            body: JSON.stringify(body),
            headers: {
                ...absAuthHeaders(server.credential),
                'Content-Type': 'application/json',
            },
            method: 'POST',
        },
    );

    await response.text?.();
};

export const absClosePlaybackSession = async (
    fetcher: SamoFetch,
    server: AbsServer,
    sessionId: string,
    body: AbsPlaybackSessionSyncRequest,
): Promise<void> => {
    await absRequest(fetcher, server.url, `/api/session/${encodeURIComponent(sessionId)}/close`, {
        body: JSON.stringify(body),
        headers: {
            ...absAuthHeaders(server.credential),
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });
};

export const absGetItemCoverDataUrl = async (
    fetcher: SamoFetch,
    server: AbsServer,
    itemId: string,
): Promise<string | undefined> => {
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

export const getAbsFetch = (fetcher?: SamoFetch): SamoFetch => {
    if (fetcher) {
        return fetcher;
    }

    return adaptNativeFetch(globalThis.fetch.bind(globalThis));
};

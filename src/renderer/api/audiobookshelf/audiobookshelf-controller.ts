import isElectron from 'is-electron';

import {
    AudiobookshelfLibrariesResponse,
    AudiobookshelfLibraryItem,
    AudiobookshelfLibraryItemsResponse,
    AudiobookshelfLoginResponse,
    AudiobookshelfPlaybackSessionResponse,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { AuthenticationResponse, ServerListItemWithCredential } from '/@/shared/types/domain-types';

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const getAuthHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
});

const loginWithFetch = async (
    url: string,
    body: { password: string; username: string },
): Promise<AudiobookshelfLoginResponse> => {
    const response = await fetch(`${normalizeBaseUrl(url)}/login`, {
        body: JSON.stringify({
            password: body.password,
            username: body.username,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`Audiobookshelf authentication failed: ${response.status}`);
    }

    return response.json() as Promise<AudiobookshelfLoginResponse>;
};

const loginWithMainProcess = async (
    url: string,
    body: { password: string; username: string },
): Promise<AudiobookshelfLoginResponse> => {
    return window.api.ipc.invoke('audiobookshelf-login', {
        password: body.password,
        url,
        username: body.username,
    }) as Promise<AudiobookshelfLoginResponse>;
};

const getLibrariesWithFetch = async (
    server: ServerListItemWithCredential,
): Promise<AudiobookshelfLibrariesResponse> => {
    const response = await fetch(`${normalizeBaseUrl(server.url)}/api/libraries`, {
        headers: getAuthHeaders(server.credential),
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(`Audiobookshelf libraries request failed: ${response.status}`);
    }

    return response.json() as Promise<AudiobookshelfLibrariesResponse>;
};

const getLibrariesWithMainProcess = async (
    server: ServerListItemWithCredential,
): Promise<AudiobookshelfLibrariesResponse> => {
    return window.api.ipc.invoke('audiobookshelf-get-libraries', {
        token: server.credential,
        url: server.url,
    }) as Promise<AudiobookshelfLibrariesResponse>;
};

const getLibraryItemsWithFetch = async (
    server: ServerListItemWithCredential,
    libraryId: string,
): Promise<AudiobookshelfLibraryItemsResponse> => {
    const response = await fetch(
        `${normalizeBaseUrl(server.url)}/api/libraries/${libraryId}/items`,
        {
            headers: getAuthHeaders(server.credential),
            method: 'GET',
        },
    );

    if (!response.ok) {
        throw new Error(`Audiobookshelf library items request failed: ${response.status}`);
    }

    return response.json() as Promise<AudiobookshelfLibraryItemsResponse>;
};

const getLibraryItemsWithMainProcess = async (
    server: ServerListItemWithCredential,
    libraryId: string,
): Promise<AudiobookshelfLibraryItemsResponse> => {
    return window.api.ipc.invoke('audiobookshelf-get-library-items', {
        libraryId,
        token: server.credential,
        url: server.url,
    }) as Promise<AudiobookshelfLibraryItemsResponse>;
};

const getItemCoverDataUrlWithFetch = async (
    server: ServerListItemWithCredential,
    itemId: string,
): Promise<string | undefined> => {
    const response = await fetch(`${normalizeBaseUrl(server.url)}/api/items/${itemId}/cover`, {
        headers: getAuthHeaders(server.credential),
        method: 'GET',
    });

    if (response.status === 404) {
        return undefined;
    }

    if (!response.ok) {
        throw new Error(`Audiobookshelf cover request failed: ${response.status}`);
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(reader.error);
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
};

const getItemCoverDataUrlWithMainProcess = async (
    server: ServerListItemWithCredential,
    itemId: string,
): Promise<string | undefined> => {
    const dataUrl = (await window.api.ipc.invoke('audiobookshelf-get-item-cover-data-url', {
        itemId,
        token: server.credential,
        url: server.url,
    })) as null | string;

    return dataUrl ?? undefined;
};

const playItemWithFetch = async (
    server: ServerListItemWithCredential,
    itemId: string,
    episodeId?: string,
): Promise<AudiobookshelfPlaybackSessionResponse> => {
    const playPath = episodeId ? `/api/items/${itemId}/play/${episodeId}` : `/api/items/${itemId}/play`;
    const response = await fetch(`${normalizeBaseUrl(server.url)}${playPath}`, {
        body: JSON.stringify({}),
        headers: {
            ...getAuthHeaders(server.credential),
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`Audiobookshelf play request failed: ${response.status}`);
    }

    return response.json() as Promise<AudiobookshelfPlaybackSessionResponse>;
};

const playItemWithMainProcess = async (
    server: ServerListItemWithCredential,
    itemId: string,
    episodeId?: string,
): Promise<AudiobookshelfPlaybackSessionResponse> => {
    return window.api.ipc.invoke('audiobookshelf-play-item', {
        episodeId,
        itemId,
        token: server.credential,
        url: server.url,
    }) as Promise<AudiobookshelfPlaybackSessionResponse>;
};

const getItemWithFetch = async (
    server: ServerListItemWithCredential,
    itemId: string,
): Promise<AudiobookshelfLibraryItem> => {
    const response = await fetch(
        `${normalizeBaseUrl(server.url)}/api/items/${itemId}?expanded=1`,
        {
            headers: getAuthHeaders(server.credential),
            method: 'GET',
        },
    );

    if (!response.ok) {
        throw new Error(`Audiobookshelf item request failed: ${response.status}`);
    }

    return response.json() as Promise<AudiobookshelfLibraryItem>;
};

const getItemWithMainProcess = async (
    server: ServerListItemWithCredential,
    itemId: string,
): Promise<AudiobookshelfLibraryItem> => {
    return window.api.ipc.invoke('audiobookshelf-get-item', {
        itemId,
        token: server.credential,
        url: server.url,
    }) as Promise<AudiobookshelfLibraryItem>;
};

export const audiobookshelfController = {
    authenticate: async (
        url: string,
        body: { password: string; username: string },
    ): Promise<AuthenticationResponse> => {
        const data = isElectron()
            ? await loginWithMainProcess(url, body)
            : await loginWithFetch(url, body);

        const { user } = data;

        if (!user?.token) {
            throw new Error('Audiobookshelf authentication failed: missing user token');
        }

        return {
            credential: user.token,
            isAdmin: user.type === 'admin',
            userId: user.id,
            username: user.username,
        };
    },

    getItem: async (server: ServerListItemWithCredential, itemId: string) => {
        return isElectron()
            ? getItemWithMainProcess(server, itemId)
            : getItemWithFetch(server, itemId);
    },

    getItemCoverDataUrl: async (server: ServerListItemWithCredential, itemId: string) => {
        return isElectron()
            ? getItemCoverDataUrlWithMainProcess(server, itemId)
            : getItemCoverDataUrlWithFetch(server, itemId);
    },

    getLibraries: async (server: ServerListItemWithCredential) => {
        return isElectron() ? getLibrariesWithMainProcess(server) : getLibrariesWithFetch(server);
    },

    getLibraryItems: async (server: ServerListItemWithCredential, libraryId: string) => {
        return isElectron()
            ? getLibraryItemsWithMainProcess(server, libraryId)
            : getLibraryItemsWithFetch(server, libraryId);
    },

    /**
     * Plays a library item. For audiobooks, omit episodeId — ABS returns the
     * book's HLS session. For podcasts, pass episodeId to play that specific
     * episode (`/api/items/:id/play/:episodeId`).
     */
    playItem: async (
        server: ServerListItemWithCredential,
        itemId: string,
        episodeId?: string,
    ) => {
        return isElectron()
            ? playItemWithMainProcess(server, itemId, episodeId)
            : playItemWithFetch(server, itemId, episodeId);
    },
};

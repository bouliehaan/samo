import isElectron from 'is-electron';

import {
    AudiobookshelfLibrariesResponse,
    AudiobookshelfLibraryItemsResponse,
    AudiobookshelfLoginResponse,
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

    getLibraries: async (server: ServerListItemWithCredential) => {
        return isElectron() ? getLibrariesWithMainProcess(server) : getLibrariesWithFetch(server);
    },

    getLibraryItems: async (server: ServerListItemWithCredential, libraryId: string) => {
        return isElectron()
            ? getLibraryItemsWithMainProcess(server, libraryId)
            : getLibraryItemsWithFetch(server, libraryId);
    },
};

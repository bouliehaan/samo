import isElectron from 'is-electron';

import { AudiobookshelfLoginResponse } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { AuthenticationResponse } from '/@/shared/types/domain-types';

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

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
};

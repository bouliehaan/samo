import {
    absClosePlaybackSession,
    absGetItem,
    absGetItemCoverDataUrl,
    absGetLibraries,
    absGetLibraryItems,
    absLogin,
    absPlayItem,
    absSyncPlaybackSession,
    adaptNativeFetch,
    getFetch,
    type AbsPlaybackSessionSyncRequest,
} from '@samo/core/server';
import isElectron from 'is-electron';

import {
    AudiobookshelfLibrariesResponse,
    AudiobookshelfLibraryItem,
    AudiobookshelfLibraryItemsResponse,
    AudiobookshelfLoginResponse,
    AudiobookshelfPlaybackSessionResponse,
    AudiobookshelfPlaybackSessionSyncRequest,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { AuthenticationResponse, ServerListItemWithCredential } from '/@/shared/types/domain-types';

const browserFetch = getFetch(adaptNativeFetch(fetch));

const toAbsServer = (server: ServerListItemWithCredential) => ({
    credential: server.credential,
    url: server.url,
});

const invokeMain = <T>(channel: string, payload: unknown) =>
    window.api.ipc.invoke(channel, payload) as Promise<T>;

const withElectronIpc = <T>(
    channel: string,
    payload: unknown,
    browserFallback: () => Promise<T>,
): Promise<T> => (isElectron() ? invokeMain<T>(channel, payload) : browserFallback());

export const audiobookshelfController = {
    authenticate: async (
        url: string,
        body: { password: string; username: string },
    ): Promise<AuthenticationResponse> => {
        const data = await withElectronIpc<AudiobookshelfLoginResponse>(
            'audiobookshelf-login',
            { password: body.password, url, username: body.username },
            () => absLogin(browserFetch, url, body),
        );

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

    closePlaybackSession: async (
        server: ServerListItemWithCredential,
        sessionId: string,
        body: AudiobookshelfPlaybackSessionSyncRequest,
    ) =>
        withElectronIpc<void>(
            'audiobookshelf-close-playback-session',
            { body, sessionId, token: server.credential, url: server.url },
            () =>
                absClosePlaybackSession(
                    browserFetch,
                    toAbsServer(server),
                    sessionId,
                    body as AbsPlaybackSessionSyncRequest,
                ),
        ),

    getItem: async (server: ServerListItemWithCredential, itemId: string) =>
        withElectronIpc<AudiobookshelfLibraryItem>(
            'audiobookshelf-get-item',
            { itemId, token: server.credential, url: server.url },
            () => absGetItem(browserFetch, toAbsServer(server), itemId) as Promise<AudiobookshelfLibraryItem>,
        ),

    getItemCoverDataUrl: async (server: ServerListItemWithCredential, itemId: string) => {
        const dataUrl = await withElectronIpc<null | string>(
            'audiobookshelf-get-item-cover-data-url',
            { itemId, token: server.credential, url: server.url },
            async () =>
                (await absGetItemCoverDataUrl(browserFetch, toAbsServer(server), itemId)) ?? null,
        );

        return dataUrl ?? undefined;
    },

    getLibraries: async (server: ServerListItemWithCredential) =>
        withElectronIpc<AudiobookshelfLibrariesResponse>(
            'audiobookshelf-get-libraries',
            { token: server.credential, url: server.url },
            () =>
                absGetLibraries(
                    browserFetch,
                    toAbsServer(server),
                ) as Promise<AudiobookshelfLibrariesResponse>,
        ),

    getLibraryItems: async (server: ServerListItemWithCredential, libraryId: string) =>
        withElectronIpc<AudiobookshelfLibraryItemsResponse>(
            'audiobookshelf-get-library-items',
            { libraryId, token: server.credential, url: server.url },
            () =>
                absGetLibraryItems(
                    browserFetch,
                    toAbsServer(server),
                    libraryId,
                ) as Promise<AudiobookshelfLibraryItemsResponse>,
        ),

    playItem: async (server: ServerListItemWithCredential, itemId: string, episodeId?: string) =>
        withElectronIpc<AudiobookshelfPlaybackSessionResponse>(
            'audiobookshelf-play-item',
            { episodeId, itemId, token: server.credential, url: server.url },
            () =>
                absPlayItem(
                    browserFetch,
                    toAbsServer(server),
                    itemId,
                    episodeId,
                ) as Promise<AudiobookshelfPlaybackSessionResponse>,
        ),

    syncPlaybackSession: async (
        server: ServerListItemWithCredential,
        sessionId: string,
        body: AudiobookshelfPlaybackSessionSyncRequest,
    ) =>
        withElectronIpc<void>(
            'audiobookshelf-sync-playback-session',
            { body, sessionId, token: server.credential, url: server.url },
            () =>
                absSyncPlaybackSession(
                    browserFetch,
                    toAbsServer(server),
                    sessionId,
                    body as AbsPlaybackSessionSyncRequest,
                ),
        ),
};

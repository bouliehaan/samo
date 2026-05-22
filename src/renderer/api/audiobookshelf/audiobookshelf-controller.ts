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

const abs = (): typeof window.api.audiobookshelf => window.api.audiobookshelf;

export const audiobookshelfController = {
    authenticate: async (
        url: string,
        body: { password: string; username: string },
    ): Promise<AuthenticationResponse> => {
        const data: AudiobookshelfLoginResponse = isElectron()
            ? await abs().login({ password: body.password, url, username: body.username })
            : await absLogin(browserFetch, url, body);

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
    ) => {
        if (isElectron()) {
            await abs().closePlaybackSession({
                body,
                sessionId,
                token: server.credential,
                url: server.url,
            });
            return;
        }
        await absClosePlaybackSession(
            browserFetch,
            toAbsServer(server),
            sessionId,
            body as AbsPlaybackSessionSyncRequest,
        );
    },

    getItem: async (
        server: ServerListItemWithCredential,
        itemId: string,
    ): Promise<AudiobookshelfLibraryItem> => {
        if (isElectron()) {
            return abs().getItem({ itemId, token: server.credential, url: server.url });
        }
        return absGetItem(
            browserFetch,
            toAbsServer(server),
            itemId,
        ) as Promise<AudiobookshelfLibraryItem>;
    },

    getItemCoverDataUrl: async (server: ServerListItemWithCredential, itemId: string) => {
        const dataUrl = isElectron()
            ? await abs().getItemCoverDataUrl({
                  itemId,
                  token: server.credential,
                  url: server.url,
              })
            : ((await absGetItemCoverDataUrl(browserFetch, toAbsServer(server), itemId)) ?? null);

        return dataUrl ?? undefined;
    },

    getLibraries: async (
        server: ServerListItemWithCredential,
    ): Promise<AudiobookshelfLibrariesResponse> => {
        if (isElectron()) {
            return abs().getLibraries({ token: server.credential, url: server.url });
        }
        return absGetLibraries(
            browserFetch,
            toAbsServer(server),
        ) as Promise<AudiobookshelfLibrariesResponse>;
    },

    getLibraryItems: async (
        server: ServerListItemWithCredential,
        libraryId: string,
    ): Promise<AudiobookshelfLibraryItemsResponse> => {
        if (isElectron()) {
            return abs().getLibraryItems({
                libraryId,
                token: server.credential,
                url: server.url,
            });
        }
        return absGetLibraryItems(
            browserFetch,
            toAbsServer(server),
            libraryId,
        ) as Promise<AudiobookshelfLibraryItemsResponse>;
    },

    playItem: async (
        server: ServerListItemWithCredential,
        itemId: string,
        episodeId?: string,
    ): Promise<AudiobookshelfPlaybackSessionResponse> => {
        if (isElectron()) {
            return abs().playItem({
                episodeId,
                itemId,
                token: server.credential,
                url: server.url,
            });
        }
        return absPlayItem(
            browserFetch,
            toAbsServer(server),
            itemId,
            episodeId,
        ) as Promise<AudiobookshelfPlaybackSessionResponse>;
    },

    syncPlaybackSession: async (
        server: ServerListItemWithCredential,
        sessionId: string,
        body: AudiobookshelfPlaybackSessionSyncRequest,
    ) => {
        if (isElectron()) {
            await abs().syncPlaybackSession({
                body,
                sessionId,
                token: server.credential,
                url: server.url,
            });
            return;
        }
        await absSyncPlaybackSession(
            browserFetch,
            toAbsServer(server),
            sessionId,
            body as AbsPlaybackSessionSyncRequest,
        );
    },
};

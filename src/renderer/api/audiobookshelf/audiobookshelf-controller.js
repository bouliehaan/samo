import { absClosePlaybackSession, absGetItem, absGetItemCoverDataUrl, absGetLibraries, absGetLibraryItems, absLogin, absPlayItem, absSyncPlaybackSession, adaptNativeFetch, getFetch, } from '@samo/core/server';
import isElectron from 'is-electron';
const browserFetch = getFetch(adaptNativeFetch(fetch));
const toAbsServer = (server) => ({
    credential: server.credential,
    url: server.url,
});
const invokeMain = (channel, payload) => window.api.ipc.invoke(channel, payload);
const withElectronIpc = (channel, payload, browserFallback) => (isElectron() ? invokeMain(channel, payload) : browserFallback());
export const audiobookshelfController = {
    authenticate: async (url, body) => {
        const data = await withElectronIpc('audiobookshelf-login', { password: body.password, url, username: body.username }, () => absLogin(browserFetch, url, body));
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
    closePlaybackSession: async (server, sessionId, body) => withElectronIpc('audiobookshelf-close-playback-session', { body, sessionId, token: server.credential, url: server.url }, () => absClosePlaybackSession(browserFetch, toAbsServer(server), sessionId, body)),
    getItem: async (server, itemId) => withElectronIpc('audiobookshelf-get-item', { itemId, token: server.credential, url: server.url }, () => absGetItem(browserFetch, toAbsServer(server), itemId)),
    getItemCoverDataUrl: async (server, itemId) => {
        const dataUrl = await withElectronIpc('audiobookshelf-get-item-cover-data-url', { itemId, token: server.credential, url: server.url }, async () => (await absGetItemCoverDataUrl(browserFetch, toAbsServer(server), itemId)) ?? null);
        return dataUrl ?? undefined;
    },
    getLibraries: async (server) => withElectronIpc('audiobookshelf-get-libraries', { token: server.credential, url: server.url }, () => absGetLibraries(browserFetch, toAbsServer(server))),
    getLibraryItems: async (server, libraryId) => withElectronIpc('audiobookshelf-get-library-items', { libraryId, token: server.credential, url: server.url }, () => absGetLibraryItems(browserFetch, toAbsServer(server), libraryId)),
    playItem: async (server, itemId, episodeId) => withElectronIpc('audiobookshelf-play-item', { episodeId, itemId, token: server.credential, url: server.url }, () => absPlayItem(browserFetch, toAbsServer(server), itemId, episodeId)),
    syncPlaybackSession: async (server, sessionId, body) => withElectronIpc('audiobookshelf-sync-playback-session', { body, sessionId, token: server.credential, url: server.url }, () => absSyncPlaybackSession(browserFetch, toAbsServer(server), sessionId, body)),
};

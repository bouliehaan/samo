import { absClosePlaybackSession, absGetItem, absGetItemCoverDataUrl, absGetLibraries, absGetLibraryItems, absLogin, absPlayItem, absSyncPlaybackSession, adaptNativeFetch, } from '@samo/core/server';
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { createAudiobookshelfProxyUrl, releaseProxySessionsForOwner } from './audiobookshelf-proxy';
const absFetch = adaptNativeFetch(fetch);
export const registerAudiobookshelfIpcHandlers = () => {
    ipcMain.handle('audiobookshelf-play-item', async (event, data) => {
        const server = { credential: data.token, url: data.url };
        const playbackSession = await absPlayItem(absFetch, server, data.itemId, data.episodeId);
        const ownerSessionId = typeof playbackSession.id === 'string' && playbackSession.id.trim()
            ? playbackSession.id
            : randomUUID();
        if (Array.isArray(playbackSession.audioTracks)) {
            playbackSession.audioTracks = await Promise.all(playbackSession.audioTracks.map(async (track) => {
                if (!track.contentUrl) {
                    return track;
                }
                return {
                    ...track,
                    contentUrl: await createAudiobookshelfProxyUrl(server.url, data.token, track.contentUrl, ownerSessionId, event.sender.id),
                };
            }));
        }
        return playbackSession;
    });
    ipcMain.handle('audiobookshelf-sync-playback-session', async (_event, data) => absSyncPlaybackSession(absFetch, { credential: data.token, url: data.url }, data.sessionId, data.body));
    ipcMain.handle('audiobookshelf-close-playback-session', async (_event, data) => {
        try {
            await absClosePlaybackSession(absFetch, { credential: data.token, url: data.url }, data.sessionId, data.body);
        }
        finally {
            releaseProxySessionsForOwner(data.sessionId);
        }
    });
    ipcMain.handle('audiobookshelf-get-item-cover-data-url', async (_event, data) => absGetItemCoverDataUrl(absFetch, { credential: data.token, url: data.url }, data.itemId));
    ipcMain.handle('audiobookshelf-get-libraries', async (_event, data) => absGetLibraries(absFetch, { credential: data.token, url: data.url }));
    ipcMain.handle('audiobookshelf-get-library-items', async (_event, data) => absGetLibraryItems(absFetch, { credential: data.token, url: data.url }, data.libraryId));
    ipcMain.handle('audiobookshelf-get-item', async (_event, data) => absGetItem(absFetch, { credential: data.token, url: data.url }, data.itemId));
    ipcMain.handle('audiobookshelf-login', async (_event, data) => absLogin(absFetch, data.url, {
        password: data.password,
        username: data.username,
    }));
};

import { ipcRenderer } from 'electron';

import type {
    AudiobookshelfLibrariesResponse,
    AudiobookshelfLibraryItem,
    AudiobookshelfLibraryItemsResponse,
    AudiobookshelfLoginResponse,
    AudiobookshelfPlaybackSessionResponse,
    AudiobookshelfPlaybackSessionSyncRequest,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';

const login = (payload: {
    password: string;
    url: string;
    username: string;
}): Promise<AudiobookshelfLoginResponse> =>
    ipcRenderer.invoke('audiobookshelf-login', payload);

const playItem = (payload: {
    episodeId?: string;
    itemId: string;
    token: string;
    url: string;
}): Promise<AudiobookshelfPlaybackSessionResponse> =>
    ipcRenderer.invoke('audiobookshelf-play-item', payload);

const syncPlaybackSession = (payload: {
    body: AudiobookshelfPlaybackSessionSyncRequest;
    sessionId: string;
    token: string;
    url: string;
}): Promise<void> => ipcRenderer.invoke('audiobookshelf-sync-playback-session', payload);

const closePlaybackSession = (payload: {
    body: AudiobookshelfPlaybackSessionSyncRequest;
    sessionId: string;
    token: string;
    url: string;
}): Promise<void> => ipcRenderer.invoke('audiobookshelf-close-playback-session', payload);

const getItemCoverDataUrl = (payload: {
    itemId: string;
    token: string;
    url: string;
}): Promise<null | string> =>
    ipcRenderer.invoke('audiobookshelf-get-item-cover-data-url', payload);

const getLibraries = (payload: {
    token: string;
    url: string;
}): Promise<AudiobookshelfLibrariesResponse> =>
    ipcRenderer.invoke('audiobookshelf-get-libraries', payload);

const getLibraryItems = (payload: {
    libraryId: string;
    token: string;
    url: string;
}): Promise<AudiobookshelfLibraryItemsResponse> =>
    ipcRenderer.invoke('audiobookshelf-get-library-items', payload);

const getItem = (payload: {
    itemId: string;
    token: string;
    url: string;
}): Promise<AudiobookshelfLibraryItem> =>
    ipcRenderer.invoke('audiobookshelf-get-item', payload);

export const audiobookshelf = {
    closePlaybackSession,
    getItem,
    getItemCoverDataUrl,
    getLibraries,
    getLibraryItems,
    login,
    playItem,
    syncPlaybackSession,
};

export type Audiobookshelf = typeof audiobookshelf;

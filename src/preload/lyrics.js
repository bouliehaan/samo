import { ipcRenderer } from 'electron';
const getRemoteLyricsBySong = (song) => ipcRenderer.invoke('lyric-by-song', song);
const searchRemoteLyrics = (params) => ipcRenderer.invoke('lyric-search', params);
const getRemoteLyricsByRemoteId = (id) => ipcRenderer.invoke('lyric-by-remote-id', id);
const clearCacheForSong = (song) => ipcRenderer.invoke('lyric-clear-cache-for-song', song);
export const lyrics = {
    clearCacheForSong,
    getRemoteLyricsByRemoteId,
    getRemoteLyricsBySong,
    searchRemoteLyrics,
};

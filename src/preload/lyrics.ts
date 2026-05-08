import { ipcRenderer } from 'electron';

import {
    InternetProviderLyricSearchResponse,
    LyricGetQuery,
    LyricSearchQuery,
    LyricSource,
} from '../main/features/core/lyrics';

import { QueueSong, Song } from '/@/shared/types/domain-types';

const getRemoteLyricsBySong = (song: QueueSong) => ipcRenderer.invoke('lyric-by-song', song);

const searchRemoteLyrics = (
    params: LyricSearchQuery,
): Promise<Record<LyricSource, InternetProviderLyricSearchResponse[]>> =>
    ipcRenderer.invoke('lyric-search', params);

const getRemoteLyricsByRemoteId = (id: LyricGetQuery) =>
    ipcRenderer.invoke('lyric-by-remote-id', id);

const clearCacheForSong = (song: Song) => ipcRenderer.invoke('lyric-clear-cache-for-song', song);

export const lyrics = {
    clearCacheForSong,
    getRemoteLyricsByRemoteId,
    getRemoteLyricsBySong,
    searchRemoteLyrics,
};

export type Lyrics = typeof lyrics;

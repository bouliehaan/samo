import { InternetProviderLyricSearchResponse, LyricGetQuery, LyricSearchQuery, LyricSource } from '../main/features/core/lyrics';
import { QueueSong, Song } from '/@/shared/types/domain-types';
export declare const lyrics: {
    clearCacheForSong: (song: Song) => Promise<any>;
    getRemoteLyricsByRemoteId: (id: LyricGetQuery) => Promise<any>;
    getRemoteLyricsBySong: (song: QueueSong) => Promise<any>;
    searchRemoteLyrics: (params: LyricSearchQuery) => Promise<Record<LyricSource, InternetProviderLyricSearchResponse[]>>;
};
export type Lyrics = typeof lyrics;

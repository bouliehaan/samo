import { Song } from '/@/shared/types/domain-types';
export declare enum LyricSource {
    GENIUS = "Genius",
    LRCLIB = "lrclib.net",
    SIMPMUSIC = "SimpMusic"
}
export type FullLyricsMetadata = Omit<InternetProviderLyricResponse, 'id' | 'lyrics' | 'source'> & {
    lyrics: LyricsResponse;
    remote: boolean;
    source: string;
};
export type InternetProviderLyricResponse = {
    artist: string;
    id: string;
    lyrics: string;
    name: string;
    source: LyricSource;
};
export type InternetProviderLyricSearchResponse = {
    artist: string;
    duration?: number;
    id: string;
    isSync: boolean | null;
    lyrics?: string;
    name: string;
    score?: number;
    source: LyricSource;
};
export type LyricGetQuery = {
    remoteSongId: string;
    remoteSource: LyricSource;
    song: Song;
};
export type LyricOverride = Omit<InternetProviderLyricResponse, 'lyrics'>;
export type LyricSearchQuery = {
    album?: string;
    artist?: string;
    duration?: number;
    name?: string;
};
export type LyricsResponse = Array<[number, string]> | string;
export type SynchronizedLyricsArray = Array<[number, string]>;

import { InternetProviderLyricResponse, InternetProviderLyricSearchResponse, LyricSearchQuery } from '.';
export interface LrcLibSearchResponse {
    albumName: string;
    artistName: string;
    duration?: number;
    id: number;
    instrumental?: boolean;
    name: string;
    plainLyrics: null | string;
    syncedLyrics: null | string;
}
export interface LrcLibTrackResponse {
    albumName: string;
    artistName: string;
    duration: number;
    id: number;
    instrumental: boolean;
    isrc: string;
    lang: string;
    name: string;
    plainLyrics: null | string;
    releaseDate: string;
    spotifyId: string;
    syncedLyrics: null | string;
}
export declare function getLyricsBySongId(songId: string, signal?: AbortSignal): Promise<null | string>;
export declare function getSearchResults(params: LyricSearchQuery, signal?: AbortSignal): Promise<InternetProviderLyricSearchResponse[] | null>;
export declare function query(params: LyricSearchQuery, signal?: AbortSignal): Promise<InternetProviderLyricResponse | null>;

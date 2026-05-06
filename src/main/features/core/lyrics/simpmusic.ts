import axios, { AxiosResponse } from 'axios';

import { InternetProviderLyricSearchResponse, LyricSearchQuery, LyricSource } from '.';
import { orderSearchResults } from './shared';

const API_URL = 'https://api-lyrics.simpmusic.org/v1';
const TIMEOUT_MS = 6000;

const isCanceled = (error: unknown) => {
    return axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED';
};

const isNotFound = (error: unknown) => {
    return axios.isAxiosError(error) && error.response?.status === 404;
};

export interface SimpMusicLyric {
    albumName?: string;
    artistName: string;
    durationSeconds?: number;
    id: string;
    plainLyric?: string;
    richSyncLyrics?: string;
    songTitle: string;
    syncedLyrics?: string;
    videoId: string;
    vote?: number;
}

export interface SimpMusicSearchResponse {
    data: SimpMusicLyric[];
    success: boolean;
}

export async function getLyricsBySongId(
    songId: string,
    signal?: AbortSignal,
): Promise<null | string> {
    let result: AxiosResponse;

    try {
        result = await axios.get(`${API_URL}/${songId}`, {
            signal,
            timeout: TIMEOUT_MS,
        });
    } catch (e) {
        if (isCanceled(e)) return null;
        if (isNotFound(e)) return null;
        console.error('SimpMusic lyrics request errored:', (e as Error)?.message);
        return null;
    }

    const firstLyric = (result.data.data?.[0] ?? result.data ?? null) as null | SimpMusicLyric;
    if (!firstLyric) return null;

    return firstLyric.syncedLyrics || firstLyric.plainLyric || null;
}

export async function getSearchResults(
    params: LyricSearchQuery,
    signal?: AbortSignal,
): Promise<InternetProviderLyricSearchResponse[] | null> {
    let result: AxiosResponse<SimpMusicSearchResponse>;

    if (!params.name) return null;

    try {
        result = await axios.get<SimpMusicSearchResponse>(`${API_URL}/search`, {
            params: {
                q: [params.artist, params.name].filter(Boolean).join(' '),
            },
            signal,
            timeout: TIMEOUT_MS,
        });
    } catch (e) {
        if (isCanceled(e)) return null;
        if (isNotFound(e)) return null;
        console.error('SimpMusic search errored:', (e as Error)?.message);
        return null;
    }

    if (!result.data?.data) return null;

    const songResults: InternetProviderLyricSearchResponse[] = result.data.data.map((song) => ({
        artist: song.artistName,
        duration: song.durationSeconds,
        id: song.videoId,
        isSync: song.syncedLyrics ? true : false,
        name: song.songTitle,
        source: LyricSource.SIMPMUSIC,
    }));

    return orderSearchResults({ params, results: songResults });
}

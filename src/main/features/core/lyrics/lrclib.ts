// Credits to https://github.com/tranxuanthang/lrcget for API implementation
import axios, { AxiosResponse } from 'axios';

import {
    InternetProviderLyricResponse,
    InternetProviderLyricSearchResponse,
    LyricSearchQuery,
    LyricSource,
} from '.';
import { orderSearchResults } from './shared';

const FETCH_URL = 'https://lrclib.net/api/get';
const SEEARCH_URL = 'https://lrclib.net/api/search';

const TIMEOUT_MS = 12000;

const isCanceled = (error: unknown) => {
    return axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED';
};

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

export async function getLyricsBySongId(
    songId: string,
    signal?: AbortSignal,
): Promise<null | string> {
    let result: AxiosResponse<LrcLibTrackResponse, any>;

    try {
        result = await axios.get<LrcLibTrackResponse>(`${FETCH_URL}/${songId}`, {
            signal,
            timeout: TIMEOUT_MS,
        });
    } catch (e) {
        if (isCanceled(e)) return null;
        console.error('LrcLib lyrics request got an error!', (e as Error)?.message);
        return null;
    }

    return result.data.syncedLyrics || result.data.plainLyrics || null;
}

export async function getSearchResults(
    params: LyricSearchQuery,
    signal?: AbortSignal,
): Promise<InternetProviderLyricSearchResponse[] | null> {
    if (!params.name && !params.artist) {
        return null;
    }

    const searchQueries = [
        [params.name, params.artist].filter(Boolean).join(' '),
        params.name,
    ].filter(
        (query, index, queries): query is string =>
            Boolean(query) && queries.indexOf(query) === index,
    );

    const searchResponses = await Promise.all(
        searchQueries.map(async (searchQuery) => {
            try {
                const result = await axios.get<LrcLibSearchResponse[]>(SEEARCH_URL, {
                    params: {
                        q: searchQuery,
                    },
                    signal,
                    timeout: TIMEOUT_MS,
                });
                return result.data ?? [];
            } catch (e) {
                if (isCanceled(e)) return [];
                console.error('LrcLib search request got an error!', (e as Error)?.message);
                return [];
            }
        }),
    );

    const uniqueResults = new Map(searchResponses.flat().map((song) => [song.id, song]));

    if (uniqueResults.size === 0) return null;

    const songResults: InternetProviderLyricSearchResponse[] = Array.from(
        uniqueResults.values(),
    ).map((song) => {
        return {
            artist: song.artistName,
            duration: song.duration,
            id: String(song.id),
            isSync: song.syncedLyrics ? true : false,
            lyrics: song.syncedLyrics || song.plainLyrics || undefined,
            name: song.name,
            source: LyricSource.LRCLIB,
        };
    });

    return orderSearchResults({ params, results: songResults });
}

export async function query(
    params: LyricSearchQuery,
    signal?: AbortSignal,
): Promise<InternetProviderLyricResponse | null> {
    let result: AxiosResponse<LrcLibTrackResponse, any>;

    try {
        result = await axios.get<LrcLibTrackResponse>(FETCH_URL, {
            headers: {
                'User-Agent': 'LRCGET v0.2.0 (https://github.com/bouliehaan/samo)',
            },
            params: {
                artist_name: params.artist,
                duration: params.duration,
                track_name: params.name,
            },
            signal,
            timeout: TIMEOUT_MS,
        });
    } catch (e) {
        if (isCanceled(e)) return null;
        console.error('LrcLib search request got an error!', (e as Error).message);
        return null;
    }

    const lyrics = result.data.syncedLyrics || result.data.plainLyrics || null;

    if (!lyrics) {
        return null;
    }

    return {
        artist: result.data.artistName,
        id: String(result.data.id),
        lyrics,
        name: result.data.name,
        source: LyricSource.LRCLIB,
    };
}

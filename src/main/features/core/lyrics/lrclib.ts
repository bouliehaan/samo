// Credits to https://github.com/tranxuanthang/lrcget for API implementation

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
    return (
        (error as Error)?.name === 'AbortError' ||
        (error as { code?: string })?.code === 'ERR_CANCELED'
    );
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
    let data: LrcLibTrackResponse;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        if (signal) signal.addEventListener('abort', () => controller.abort());

        const response = await fetch(`${FETCH_URL}/${songId}`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        data = await response.json();
    } catch (e) {
        if (isCanceled(e)) return null;
        console.error('LrcLib lyrics request got an error!', (e as Error)?.message);
        return null;
    }

    return data.syncedLyrics || data.plainLyrics || null;
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
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
                if (signal) signal.addEventListener('abort', () => controller.abort());

                const response = await fetch(
                    `${SEEARCH_URL}?q=${encodeURIComponent(searchQuery)}`,
                    {
                        signal: controller.signal,
                    },
                );
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data: LrcLibSearchResponse[] = await response.json();
                return data ?? [];
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
    let data: LrcLibTrackResponse;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        if (signal) signal.addEventListener('abort', () => controller.abort());

        const url = new URL(FETCH_URL);
        if (params.artist) url.searchParams.append('artist_name', params.artist);
        if (params.duration) url.searchParams.append('duration', String(params.duration));
        if (params.name) url.searchParams.append('track_name', params.name);

        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'LRCGET v0.2.0 (https://github.com/bouliehaan/samo)',
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        data = await response.json();
    } catch (e) {
        if (isCanceled(e)) return null;
        console.error('LrcLib search request got an error!', (e as Error).message);
        return null;
    }

    const lyrics = data.syncedLyrics || data.plainLyrics || null;

    if (!lyrics) {
        return null;
    }

    return {
        artist: data.artistName,
        id: String(data.id),
        lyrics,
        name: data.name,
        source: LyricSource.LRCLIB,
    };
}

import { ipcMain } from 'electron';

import { store } from '../settings';
import { getLyricsBySongId as getGenius, getSearchResults as searchGenius } from './genius';
import { getLyricsBySongId as getLrcLib, getSearchResults as searchLrcLib } from './lrclib';
import { getLyricsBySongId as getNetease, getSearchResults as searchNetease } from './netease';
import { orderSearchResults } from './shared';
import {
    getLyricsBySongId as getSimpMusic,
    getSearchResults as searchSimpMusic,
} from './simpmusic';

import { Song } from '/@/shared/types/domain-types';

export enum LyricSource {
    GENIUS = 'Genius',
    LRCLIB = 'lrclib.net',
    NETEASE = 'NetEase',
    SIMPMUSIC = 'SimpMusic',
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
    id: string;
    isSync: boolean | null;
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

export type LyricsResponse = string | SynchronizedLyricsArray;

export type SynchronizedLyricsArray = Array<[number, string]>;

type CachedLyrics = Record<LyricSource, InternetProviderLyricResponse>;
type GetFetcher = (id: string) => Promise<null | string>;
type SearchFetcher = (
    params: LyricSearchQuery,
) => Promise<InternetProviderLyricSearchResponse[] | null>;

const SEARCH_FETCHERS: Record<LyricSource, SearchFetcher> = {
    [LyricSource.GENIUS]: searchGenius,
    [LyricSource.LRCLIB]: searchLrcLib,
    [LyricSource.NETEASE]: searchNetease,
    [LyricSource.SIMPMUSIC]: searchSimpMusic,
};

const GET_FETCHERS: Record<LyricSource, GetFetcher> = {
    [LyricSource.GENIUS]: getGenius,
    [LyricSource.LRCLIB]: getLrcLib,
    [LyricSource.NETEASE]: getNetease,
    [LyricSource.SIMPMUSIC]: getSimpMusic,
};

const MAX_CACHED_ITEMS = 100;

const lyricCache = new Map<string, CachedLyrics>();

const SEARCH_TIMEOUT_MS = 3000;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Search timeout after ${ms}ms`)), ms),
        ),
    ]);
};

const searchAllSources = async (
    params: LyricSearchQuery,
): Promise<InternetProviderLyricSearchResponse[]> => {
    const sources = store.get('lyrics', []) as LyricSource[];

    const searchPromises = sources.map((source) =>
        withTimeout(
            SEARCH_FETCHERS[source](params).then((searchResults) => ({ searchResults, source })),
            SEARCH_TIMEOUT_MS,
        ),
    );

    const settled = await Promise.allSettled(searchPromises);

    const allSearchResults: InternetProviderLyricSearchResponse[] = [];

    for (const result of settled) {
        if (result.status === 'fulfilled' && result.value.searchResults) {
            allSearchResults.push(...result.value.searchResults);
        } else if (result.status === 'rejected') {
            const index = settled.indexOf(result);
            console.error(`Error searching ${sources[index]} for lyrics:`, result.reason);
        }
    }
    return allSearchResults;
};

const getRemoteLyrics = async (song: Song) => {
    const sources = store.get('lyrics', []) as LyricSource[];

    const cached = lyricCache.get(song.id.toString());

    if (cached) {
        for (const source of sources) {
            const data = cached[source];
            if (data) return data;
        }
    }

    const params: LyricSearchQuery = {
        album: song.album || song.name,
        artist: song.artists[0].name,
        duration: song.duration / 1000.0,
        name: song.name,
    };

    const allSearchResults = await searchAllSources(params);

    if (allSearchResults.length === 0) {
        return null;
    }

    const rankedResults = orderSearchResults({
        params,
        results: allSearchResults,
    });

    // Score is 0-1 where 0 = perfect match, 1 = worst match
    const matchThreshold = 0.55;

    // Filter to candidates within threshold
    const validCandidates = rankedResults.filter((match) => (match.score ?? 1) <= matchThreshold);

    if (validCandidates.length === 0) {
        return null;
    }

    // Race-based fetching: fetch from top 3 candidates in parallel, return first success
    const fetchPromises = validCandidates.slice(0, 3).map(async (match) => {
        try {
            const lyrics = await GET_FETCHERS[match.source](match.id);
            if (lyrics) {
                return {
                    artist: match.artist,
                    id: match.id,
                    lyrics,
                    name: match.name,
                    source: match.source,
                };
            }
        } catch (error) {
            console.error(`Error fetching lyrics from ${match.source}:`, error);
        }
        return null;
    });

    let lyricsFromSource: InternetProviderLyricResponse | null = null;

    // Use Promise.race to get the first successful result
    try {
        lyricsFromSource = await Promise.race(
            fetchPromises.map((p) =>
                p.then((result) => {
                    if (result) return result;
                    return new Promise<InternetProviderLyricResponse>((_, reject) =>
                        reject(new Error('No lyrics found')),
                    );
                }),
            ),
        );
    } catch {
        // If race fails, try to get any successful result
        const settled = await Promise.allSettled(fetchPromises);
        for (const result of settled) {
            if (result.status === 'fulfilled' && result.value) {
                lyricsFromSource = result.value;
                break;
            }
        }
    }

    if (lyricsFromSource) {
        const newResult = cached
            ? {
                  ...cached,
                  [lyricsFromSource.source]: lyricsFromSource,
              }
            : ({ [lyricsFromSource.source]: lyricsFromSource } as CachedLyrics);

        if (lyricCache.size === MAX_CACHED_ITEMS && cached === undefined) {
            const toRemove = lyricCache.keys().next().value;
            if (toRemove) {
                lyricCache.delete(toRemove);
            }
        }

        lyricCache.set(song.id.toString(), newResult);
    }

    return lyricsFromSource;
};

const searchRemoteLyrics = async (params: LyricSearchQuery) => {
    const allSearchResults = await searchAllSources(params);

    const results: Record<LyricSource, InternetProviderLyricSearchResponse[]> = {
        [LyricSource.GENIUS]: [],
        [LyricSource.LRCLIB]: [],
        [LyricSource.NETEASE]: [],
        [LyricSource.SIMPMUSIC]: [],
    };
    for (const item of allSearchResults) {
        results[item.source].push(item);
    }
    return results;
};

const getRemoteLyricsById = async (params: LyricGetQuery): Promise<null | string> => {
    const { remoteSongId, remoteSource } = params;
    const response = await GET_FETCHERS[remoteSource](remoteSongId);

    if (!response) {
        return null;
    }

    return response;
};

ipcMain.handle('lyric-by-song', async (_event, song: any) => {
    const lyric = await getRemoteLyrics(song);
    return lyric;
});

ipcMain.handle('lyric-search', async (_event, params: LyricSearchQuery) => {
    const lyricResults = await searchRemoteLyrics(params);
    return lyricResults;
});

ipcMain.handle('lyric-by-remote-id', async (_event, params: LyricGetQuery) => {
    const lyricResults = await getRemoteLyricsById(params);
    return lyricResults;
});

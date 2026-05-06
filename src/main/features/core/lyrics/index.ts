import crypto from 'crypto';
import { app, ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

import { store } from '../settings';
import { getLyricsBySongId as getGenius, getSearchResults as searchGenius } from './genius';
import {
    getLyricsBySongId as getLrcLib,
    query as queryLrcLib,
    getSearchResults as searchLrcLib,
} from './lrclib';
import { orderSearchResults } from './shared';
import {
    getLyricsBySongId as getSimpMusic,
    getSearchResults as searchSimpMusic,
} from './simpmusic';

import { Song } from '/@/shared/types/domain-types';

export enum LyricSource {
    GENIUS = 'Genius',
    LRCLIB = 'lrclib.net',
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
    duration?: number;
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
type DirectFetcher = (
    params: LyricSearchQuery,
    signal?: AbortSignal,
) => Promise<InternetProviderLyricResponse | null>;
type GetFetcher = (id: string, signal?: AbortSignal) => Promise<null | string>;
type SearchFetcher = (
    params: LyricSearchQuery,
    signal?: AbortSignal,
) => Promise<InternetProviderLyricSearchResponse[] | null>;

const DIRECT_FETCHERS: Partial<Record<LyricSource, DirectFetcher>> = {
    [LyricSource.LRCLIB]: queryLrcLib,
};

const SEARCH_FETCHERS: Record<LyricSource, SearchFetcher> = {
    [LyricSource.GENIUS]: searchGenius,
    [LyricSource.LRCLIB]: searchLrcLib,
    [LyricSource.SIMPMUSIC]: searchSimpMusic,
};

const GET_FETCHERS: Record<LyricSource, GetFetcher> = {
    [LyricSource.GENIUS]: getGenius,
    [LyricSource.LRCLIB]: getLrcLib,
    [LyricSource.SIMPMUSIC]: getSimpMusic,
};

const MAX_CACHED_ITEMS = 100;

const lyricCache = new Map<string, CachedLyrics>();

const SEARCH_TIMEOUT_MS = 7000;
const FETCH_PHASE_TIMEOUT_MS = 15000;
const GENIUS_AUTO_DELAY_MS = 2000;
const LRCLIB_HEDGE_DELAY_MS = 150;
const PERSISTED_CACHE_MAX_BYTES = 25 * 1024 * 1024;
const PERSISTED_CACHE_MAX_ITEMS = 1000;
const DURATION_MISMATCH_MIN_SECONDS = 8;
const DURATION_MISMATCH_RATIO = 0.08;
const PERSISTED_CACHE_VERSION = 2;

const isOfflineMode = () => Boolean(store.get('offline_mode', false));

const getPersistedCacheDir = () => path.join(app.getPath('userData'), 'lyrics-cache');

const logTiming = (label: string, startedAt: number, meta?: Record<string, unknown>) => {
    const elapsedMs = Math.round(performance.now() - startedAt);
    console.info(`[lyrics] ${label} finished in ${elapsedMs}ms`, meta ?? {});
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isDurationMatch = (expected?: number, actual?: number) => {
    if (!expected || !actual) return true;
    const toleranceSeconds = Math.max(
        DURATION_MISMATCH_MIN_SECONDS,
        expected * DURATION_MISMATCH_RATIO,
    );
    return Math.abs(expected - actual) <= toleranceSeconds;
};

const getPersistedCacheFile = (song: Song) => {
    const serverId = '_serverId' in song ? song._serverId : undefined;
    const key = crypto
        .createHash('sha1')
        .update(`${serverId ?? 'unknown'}:${song.id}`)
        .digest('hex');
    return path.join(getPersistedCacheDir(), `${key}.json`);
};

const readPersistedCachedLyrics = async (
    song: Song,
    sources: LyricSource[],
): Promise<InternetProviderLyricResponse | null> => {
    const startedAt = performance.now();
    try {
        const raw = await fs.readFile(getPersistedCacheFile(song), 'utf8');
        const data = JSON.parse(raw) as { lyrics?: CachedLyrics; version?: number };
        if (data.version !== PERSISTED_CACHE_VERSION) return null;
        const cached = data.lyrics;
        if (!cached) return null;

        lyricCache.set(song.id.toString(), cached);

        for (const source of sources) {
            const result = cached[source];
            if (result) {
                logTiming('persistent cache hit', startedAt, {
                    song: song.name,
                    source,
                });
                return result;
            }
        }
    } catch {
        return null;
    }

    return null;
};

const prunePersistedCache = async () => {
    try {
        const cacheDir = getPersistedCacheDir();
        const entries = await fs.readdir(cacheDir, { withFileTypes: true });
        const files = await Promise.all(
            entries
                .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
                .map(async (entry) => {
                    const filePath = path.join(cacheDir, entry.name);
                    const stats = await fs.stat(filePath);
                    return {
                        mtimeMs: stats.mtimeMs,
                        path: filePath,
                        size: stats.size,
                    };
                }),
        );

        files.sort((a, b) => b.mtimeMs - a.mtimeMs);

        let totalBytes = 0;
        for (const [index, file] of files.entries()) {
            totalBytes += file.size;
            if (index >= PERSISTED_CACHE_MAX_ITEMS || totalBytes > PERSISTED_CACHE_MAX_BYTES) {
                await fs.unlink(file.path).catch(() => undefined);
            }
        }
    } catch {
        // Cache pruning is opportunistic. A failed prune should not block lyrics.
    }
};

const writePersistedCachedLyrics = async (song: Song, cached: CachedLyrics) => {
    try {
        await fs.mkdir(getPersistedCacheDir(), { recursive: true });
        await fs.writeFile(
            getPersistedCacheFile(song),
            JSON.stringify({
                lyrics: cached,
                updatedAt: Date.now(),
                version: PERSISTED_CACHE_VERSION,
            }),
            'utf8',
        );
        await prunePersistedCache();
    } catch (error) {
        console.error('Error writing persisted lyrics cache:', error);
    }
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
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
    const sources = (store.get('lyrics', []) as string[]).filter(
        (s): s is LyricSource => s in SEARCH_FETCHERS,
    );

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

const firstNonNull = async <T>(
    promises: Promise<null | T>[],
    onFirstResult?: () => void,
): Promise<null | T> => {
    if (promises.length === 0) return null;

    return new Promise((resolve) => {
        let pending = promises.length;
        let settled = false;

        const finishEmpty = () => {
            pending -= 1;
            if (!settled && pending === 0) {
                settled = true;
                resolve(null);
            }
        };

        for (const promise of promises) {
            promise
                .then((value) => {
                    if (settled) return;
                    if (value) {
                        settled = true;
                        onFirstResult?.();
                        resolve(value);
                        return;
                    }
                    finishEmpty();
                })
                .catch(() => {
                    finishEmpty();
                });
        }
    });
};

const fetchFirstMatchingLyrics = async (
    source: LyricSource,
    params: LyricSearchQuery,
    signal?: AbortSignal,
): Promise<InternetProviderLyricResponse | null> => {
    const startedAt = performance.now();

    const searchAndFetch = async (signal?: AbortSignal) => {
        if (signal?.aborted) return null;
        const searchStartedAt = performance.now();
        const searchResults = await withTimeout(
            SEARCH_FETCHERS[source](params, signal),
            SEARCH_TIMEOUT_MS,
        );
        logTiming('provider search', searchStartedAt, {
            count: searchResults?.length ?? 0,
            song: params.name,
            source,
        });

        if (!searchResults?.length) return null;
        if (signal?.aborted) return null;

        const rankedResults = orderSearchResults({
            params,
            results: searchResults,
        });

        // Score is 0-1 where 0 = perfect match, 1 = worst match
        const matchThreshold = 0.55;
        const validCandidates = rankedResults.filter(
            (match) =>
                (match.score ?? 1) <= matchThreshold &&
                isDurationMatch(params.duration, match.duration),
        );

        const candidateController = new AbortController();
        const handleAbort = () => candidateController.abort();
        signal?.addEventListener('abort', handleAbort, { once: true });

        const fetchPromises = validCandidates.slice(0, 3).map(async (match) => {
            const fetchStartedAt = performance.now();
            try {
                const lyrics = await GET_FETCHERS[match.source](
                    match.id,
                    candidateController.signal,
                );
                logTiming('provider candidate fetch', fetchStartedAt, {
                    hit: Boolean(lyrics),
                    song: match.name,
                    source: match.source,
                });
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

        const result = await firstNonNull(fetchPromises, () => candidateController.abort());
        signal?.removeEventListener('abort', handleAbort);
        candidateController.abort();
        return result;
    };

    const directFetcher = DIRECT_FETCHERS[source];
    if (directFetcher) {
        const hedgeController = new AbortController();
        const handleAbort = () => hedgeController.abort();
        signal?.addEventListener('abort', handleAbort, { once: true });

        const directPromise = (async () => {
            const directStartedAt = performance.now();
            const directResult = await withTimeout(
                directFetcher(params, hedgeController.signal),
                SEARCH_TIMEOUT_MS,
            );
            logTiming('provider direct fetch', directStartedAt, {
                hit: Boolean(directResult),
                song: params.name,
                source,
            });
            return directResult;
        })().catch((error) => {
            console.error(`Error getting exact lyrics from ${source}:`, error);
            return null;
        });

        const searchPromise = delay(LRCLIB_HEDGE_DELAY_MS).then(() =>
            searchAndFetch(hedgeController.signal),
        );
        const result = await firstNonNull([directPromise, searchPromise], () =>
            hedgeController.abort(),
        );
        hedgeController.abort();
        signal?.removeEventListener('abort', handleAbort);
        logTiming('provider total', startedAt, {
            hit: Boolean(result),
            song: params.name,
            source,
        });
        return result;
    }

    const result = await searchAndFetch(signal);
    logTiming('provider total', startedAt, {
        hit: Boolean(result),
        song: params.name,
        source,
    });
    return result;
};

const cacheLyricsResult = async (song: Song, lyrics: InternetProviderLyricResponse) => {
    const latestCached = lyricCache.get(song.id.toString());
    const nextCached = {
        ...latestCached,
        [lyrics.source]: lyrics,
    } as CachedLyrics;

    if (lyricCache.size === MAX_CACHED_ITEMS && latestCached === undefined) {
        const toRemove = lyricCache.keys().next().value;
        if (toRemove) {
            lyricCache.delete(toRemove);
        }
    }

    lyricCache.set(song.id.toString(), nextCached);
    await writePersistedCachedLyrics(song, nextCached);
};

const getRemoteLyrics = async (song: Song) => {
    const startedAt = performance.now();
    const sources = (store.get('lyrics', []) as string[]).filter(
        (s): s is LyricSource => s in SEARCH_FETCHERS,
    );

    const cached = lyricCache.get(song.id.toString());

    if (cached) {
        for (const source of sources) {
            const data = cached[source];
            if (data) {
                logTiming('memory cache hit', startedAt, {
                    song: song.name,
                    source,
                });
                return data;
            }
        }
    }

    const persisted = await readPersistedCachedLyrics(song, sources);
    if (persisted) return persisted;

    if (isOfflineMode()) {
        logTiming('offline miss', startedAt, {
            song: song.name,
        });
        return null;
    }

    const params: LyricSearchQuery = {
        album: song.album || song.name,
        artist: song.artists[0].name,
        duration: song.duration / 1000.0,
        name: song.name,
    };

    const getSourceLyrics = async (source: LyricSource) => {
        try {
            const lyrics = await fetchFirstMatchingLyrics(source, params, fetchController.signal);
            if (lyrics) {
                void cacheLyricsResult(song, lyrics).catch((error) => {
                    console.error('Error caching lyrics result:', error);
                });
            }
            return lyrics;
        } catch (error) {
            console.error(`Error searching ${source} for lyrics:`, error);
        }
        return null;
    };

    let lyricsFromSource: InternetProviderLyricResponse | null = null;
    const fetchController = new AbortController();
    const primarySources = sources.filter((source) => source !== LyricSource.GENIUS);
    const geniusSources = sources.filter((source) => source === LyricSource.GENIUS);
    const primaryPromises = primarySources.map(getSourceLyrics);

    try {
        if (primaryPromises.length > 0) {
            const primaryResult = firstNonNull(primaryPromises, () => fetchController.abort());
            lyricsFromSource = await withTimeout(primaryResult, GENIUS_AUTO_DELAY_MS).catch(
                () => null,
            );
        }

        if (!lyricsFromSource) {
            const geniusPromises = geniusSources.map(getSourceLyrics);
            lyricsFromSource = await withTimeout(
                firstNonNull([...primaryPromises, ...geniusPromises], () =>
                    fetchController.abort(),
                ),
                FETCH_PHASE_TIMEOUT_MS,
            );
        }
    } catch {
        console.error('Lyrics fetch phase timed out');
    }

    logTiming('remote lyrics total', startedAt, {
        hit: Boolean(lyricsFromSource),
        song: song.name,
        source: lyricsFromSource?.source,
    });

    return lyricsFromSource;
};

const searchRemoteLyrics = async (params: LyricSearchQuery) => {
    if (isOfflineMode()) {
        return {
            [LyricSource.GENIUS]: [],
            [LyricSource.LRCLIB]: [],
            [LyricSource.SIMPMUSIC]: [],
        };
    }

    const allSearchResults = await searchAllSources(params);

    const results: Record<LyricSource, InternetProviderLyricSearchResponse[]> = {
        [LyricSource.GENIUS]: [],
        [LyricSource.LRCLIB]: [],
        [LyricSource.SIMPMUSIC]: [],
    };
    for (const item of allSearchResults) {
        results[item.source].push(item);
    }
    return results;
};

const getRemoteLyricsById = async (params: LyricGetQuery): Promise<null | string> => {
    if (isOfflineMode()) return null;

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

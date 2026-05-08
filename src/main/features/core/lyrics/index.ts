import { app, ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';

import { store } from '../settings';
import {
    getLyricsBySongId as getLrcLib,
    query as queryLrcLib,
    getSearchResults as searchLrcLib,
} from './lrclib';

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

const CACHE_MAX_ENTRIES = 200;
const CACHE_FILE = 'lyrics-cache.json';
const CACHE_WRITE_DEBOUNCE_MS = 1000;

type CacheEntry = {
    result: InternetProviderLyricResponse | null;
    updatedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<InternetProviderLyricResponse | null>>();
let cacheLoaded = false;
let cacheWriteTimer: NodeJS.Timeout | null = null;

const isOfflineMode = () => Boolean(store.get('offline_mode', false));

const cacheFilePath = () => path.join(app.getPath('userData'), CACHE_FILE);

const loadCache = async () => {
    if (cacheLoaded) return;
    cacheLoaded = true;
    try {
        const raw = await fs.readFile(cacheFilePath(), 'utf8');
        const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
        for (const [key, entry] of Object.entries(parsed)) {
            cache.set(key, entry);
        }
    } catch {
        // No cache yet, fine.
    }
};

const scheduleCacheWrite = () => {
    if (cacheWriteTimer) clearTimeout(cacheWriteTimer);
    cacheWriteTimer = setTimeout(() => {
        cacheWriteTimer = null;
        const obj: Record<string, CacheEntry> = {};
        for (const [key, entry] of cache) obj[key] = entry;
        fs.writeFile(cacheFilePath(), JSON.stringify(obj), 'utf8').catch((error) => {
            console.error('[lyrics] cache write failed', error);
        });
    }, CACHE_WRITE_DEBOUNCE_MS);
};

const cacheKey = (song: Song) => {
    const serverId = '_serverId' in song ? song._serverId : 'unknown';
    return `${serverId ?? 'unknown'}:${song.id}`;
};

const setCache = (key: string, result: InternetProviderLyricResponse | null) => {
    cache.set(key, { result, updatedAt: Date.now() });
    if (cache.size > CACHE_MAX_ENTRIES) {
        const oldestKey = [...cache.entries()].sort(
            (a, b) => a[1].updatedAt - b[1].updatedAt,
        )[0]?.[0];
        if (oldestKey) cache.delete(oldestKey);
    }
    scheduleCacheWrite();
};

const buildSearchParams = (song: Song): LyricSearchQuery => ({
    // Pass album only if we have one — LRCLib's direct match is signature-based and a
    // fake album (e.g. song.name) makes the direct match fail for songs LRCLib has but
    // tagged differently than your library.
    album: song.album || undefined,
    artist: song.artists?.[0]?.name || song.artistName || song.albumArtistName || undefined,
    duration: song.duration ? song.duration / 1000 : undefined,
    name: song.name,
});

const fetchFromLrcLib = async (
    song: Song,
    signal?: AbortSignal,
): Promise<InternetProviderLyricResponse | null> => {
    const params = buildSearchParams(song);

    // Direct lookup first — LRCLib's highest-precision path when the metadata signature matches.
    const direct = await queryLrcLib(params, signal).catch(() => null);
    if (direct) return direct;

    // Fall back to search when the direct match misses (re-releases, single-vs-album,
    // or any metadata that doesn't line up exactly with what LRCLib has).
    const results = await searchLrcLib(params, signal).catch(() => null);
    if (!results?.length) return null;

    const best = results[0];
    // LRCLib returns lyrics inline with search results; only fetch separately when missing.
    const lyrics = best.lyrics ?? (await getLrcLib(best.id, signal).catch(() => null));
    if (!lyrics) return null;

    return {
        artist: best.artist,
        id: best.id,
        lyrics,
        name: best.name,
        source: LyricSource.LRCLIB,
    };
};

const getRemoteLyrics = async (song: Song): Promise<InternetProviderLyricResponse | null> => {
    await loadCache();

    const key = cacheKey(song);
    const cached = cache.get(key);
    if (cached) return cached.result;

    if (isOfflineMode()) return null;

    // Dedupe concurrent fetches for the same song (e.g. sidebar + fullscreen mounting at once).
    const existing = inFlight.get(key);
    if (existing) return existing;

    const task = fetchFromLrcLib(song)
        .then((result) => {
            setCache(key, result);
            return result;
        })
        .finally(() => {
            inFlight.delete(key);
        });

    inFlight.set(key, task);
    return task;
};

const searchRemoteLyrics = async (
    params: LyricSearchQuery,
): Promise<Record<LyricSource, InternetProviderLyricSearchResponse[]>> => {
    const empty = {
        [LyricSource.GENIUS]: [],
        [LyricSource.LRCLIB]: [],
        [LyricSource.SIMPMUSIC]: [],
    };
    if (isOfflineMode()) return empty;

    const results = await searchLrcLib(params).catch(() => null);
    // Strip the inline lyrics from search results before returning over IPC — keeps the
    // payload small. The renderer fetches the full lyric on demand via the override flow.
    const trimmed = (results ?? []).map((entry) => ({
        artist: entry.artist,
        duration: entry.duration,
        id: entry.id,
        isSync: entry.isSync,
        name: entry.name,
        score: entry.score,
        source: entry.source,
    }));
    return {
        ...empty,
        [LyricSource.LRCLIB]: trimmed,
    };
};

const getRemoteLyricsById = async (params: LyricGetQuery): Promise<null | string> => {
    if (isOfflineMode()) return null;
    if (params.remoteSource !== LyricSource.LRCLIB) return null;
    return getLrcLib(params.remoteSongId).catch(() => null);
};

ipcMain.handle('lyric-by-song', async (_event, song: Song) => getRemoteLyrics(song));

ipcMain.handle('lyric-search', async (_event, params: LyricSearchQuery) =>
    searchRemoteLyrics(params),
);

ipcMain.handle('lyric-by-remote-id', async (_event, params: LyricGetQuery) =>
    getRemoteLyricsById(params),
);

ipcMain.handle('lyric-clear-cache-for-song', async (_event, song: Song) => {
    await loadCache();
    const key = cacheKey(song);
    cache.delete(key);
    scheduleCacheWrite();
});

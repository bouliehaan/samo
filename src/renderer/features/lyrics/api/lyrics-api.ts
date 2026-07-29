import { queryOptions } from '@tanstack/react-query';
import isElectron from 'is-electron';

import { queryKeys } from '/@/renderer/api/query-keys';
import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { getServerById, useSettingsStore } from '/@/renderer/store';
import {
    FullLyricsMetadata,
    InternetProviderLyricResponse,
    InternetProviderLyricSearchResponse,
    LyricGetQuery,
    LyricSearchQuery,
    LyricSource,
    LyricsQuery,
    LyricsResponse,
    QueueSong,
    Song,
    StructuredLyric,
    SynchronizedLyricsArray,
} from '/@/shared/types/domain-types';

const lyricsIpc = isElectron() ? window.api.lyrics : null;

export type LyricsQueryResult = {
    local: FullLyricsMetadata | null | StructuredLyric[];
    remoteAuto: FullLyricsMetadata | null;
};

const LRC_TIME_EXP = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?]([^\n]+)(\n|$)/g;
const ALTERNATE_TIME_EXP = /\[(\d*),(\d*)]([^\n]+)(\n|$)/g;

const formatLyrics = (lyrics: string): string | SynchronizedLyricsArray => {
    const synced: SynchronizedLyricsArray = [];

    for (const line of lyrics.matchAll(LRC_TIME_EXP)) {
        const [, minute, sec, ms, text] = line;
        const minutes = parseInt(minute, 10);
        const seconds = parseInt(sec, 10);
        const millis = ms ? (ms.length === 3 ? parseInt(ms, 10) : parseInt(ms, 10) * 10) : 0;
        synced.push([(minutes * 60 + seconds) * 1000 + millis, text]);
    }
    if (synced.length > 0) return synced;

    for (const line of lyrics.matchAll(ALTERNATE_TIME_EXP)) {
        const [, timeMs, , text] = line;
        const cleaned = text
            .replaceAll(/\(\d+,\d+\)/g, '')
            .replaceAll(/\s,/g, ',')
            .replaceAll(/\s\./g, '.');
        synced.push([Number(timeMs), cleaned]);
    }
    if (synced.length > 0) return synced;

    return lyrics;
};

export const formatLyricsForDisplay = formatLyrics;

const fetchLocalLyrics = async (params: {
    serverId: string;
    signal?: AbortSignal;
    song: QueueSong;
}): Promise<FullLyricsMetadata | null | StructuredLyric[]> => {
    const { serverId, song } = params;
    const server = getServerById(serverId);
    if (!server) return null;

    if (song.lyrics) {
        return {
            artist: song.artists?.[0]?.name,
            lyrics: formatLyrics(song.lyrics),
            name: song.name,
            remote: false,
            source: server?.name ?? 'music server',
        };
    }

    return null;
};

const fetchRemoteLyricsAuto = async (song: QueueSong): Promise<FullLyricsMetadata | null> => {
    if (!useSettingsStore.getState().lyrics.fetch) return null;
    const result: InternetProviderLyricResponse | null =
        await lyricsIpc?.getRemoteLyricsBySong(song);
    if (!result) return null;
    const lyrics = formatLyrics(result.lyrics);
    return { ...result, lyrics, remote: true };
};

export const fetchRemoteLyricsById = async (params: {
    remoteSongId: string;
    remoteSource: LyricSource;
    song?: QueueSong | Song;
}): Promise<LyricsResponse | null> => {
    const result = await lyricsIpc?.getRemoteLyricsByRemoteId(params as LyricGetQuery);
    if (!result) return null;
    return formatLyrics(result);
};

export const clearLyricsCacheForSong = async (song: QueueSong | Song): Promise<void> => {
    await lyricsIpc?.clearCacheForSong(song as Song);
};

export const lyricsQueries = {
    search: (args: Omit<QueryHookArgs<LyricSearchQuery>, 'serverId'>) =>
        queryOptions({
            gcTime: 1000 * 60,
            queryFn: async () => {
                if (!lyricsIpc) {
                    return {} as Record<LyricSource, InternetProviderLyricSearchResponse[]>;
                }
                return lyricsIpc.searchRemoteLyrics(args.query);
            },
            queryKey: queryKeys.songs.lyricsSearch(args.query),
            staleTime: 1000 * 60,
            ...args.options,
        }),
    songLyrics: (args: QueryHookArgs<LyricsQuery>, song: QueueSong | undefined) =>
        queryOptions({
            gcTime: Infinity,
            queryFn: async ({ signal }): Promise<LyricsQueryResult> => {
                if (!song) return { local: null, remoteAuto: null };
                const [local, remoteAuto] = await Promise.all([
                    fetchLocalLyrics({ serverId: args.serverId, signal, song }),
                    fetchRemoteLyricsAuto(song),
                ]);
                return { local, remoteAuto };
            },
            queryKey: queryKeys.songs.lyrics(args.serverId, args.query),
            // When we got a hit, the result is stable forever for this song. When we didn't,
            // mark it stale immediately so re-mounting (small ↔ fullscreen) re-tries quickly
            // — the main-process cache absorbs duplicate requests.
            staleTime: (query) => {
                const data = query.state.data as LyricsQueryResult | undefined;
                return data?.local || data?.remoteAuto ? Infinity : 0;
            },
            ...args.options,
        }),
    songLyricsByRemoteId: (args: QueryHookArgs<Partial<LyricGetQuery>>) =>
        queryOptions({
            gcTime: Infinity,
            queryFn: async () => {
                const q = args.query;
                if (!q?.remoteSongId || !q?.remoteSource) return null;
                return fetchRemoteLyricsById({
                    remoteSongId: q.remoteSongId,
                    remoteSource: q.remoteSource as LyricSource,
                    song: q.song as QueueSong | Song | undefined,
                });
            },
            queryKey: queryKeys.songs.lyricsByRemoteId(args.query),
            staleTime: Infinity,
            ...args.options,
        }),
};

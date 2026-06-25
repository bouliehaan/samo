import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import {
    isSamoLongFormServer,
    listSamoAudiobookLibraryItems,
    listSamoPodcastLibraryItems,
} from '/@/renderer/api/samo/samo-long-form';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { searchQueries } from '/@/renderer/features/search/api/search-api';
import {
    buildNeedleContext,
    NeedleContext,
    normalize,
    scoreCandidate,
} from '/@/renderer/features/search/utils/relevance';
import { useCurrentServer, useLongFormMediaServer } from '/@/renderer/store';
import { LongFormLibraryItem, LongFormPodcastEpisode } from '/@/shared/api/long-form-types';
import {
    Album,
    AlbumArtist,
    InternetRadioStation,
    Playlist,
    PlaylistListSort,
    Song,
    SortOrder,
} from '/@/shared/types/domain-types';

const RESULT_LIMIT_PER_GROUP = 6;
const BEST_MATCHES_LIMIT = 4;
const SHORT_QUERY_THRESHOLD = 3;
const ENTITY_TYPE_BUMP = 50;

const MUSIC_SEARCH_STALE_TIME_MS = 1000 * 60;
const ABS_LIBRARY_STALE_TIME_MS = 1000 * 60 * 5;
const ABS_LIBRARY_GC_TIME_MS = 1000 * 60 * 30;

export type RankedAlbum = { album: Album; kind: 'album'; score: number };

export type RankedArtist = { artist: AlbumArtist; kind: 'artist'; score: number };
export type RankedAudiobook = {
    item: LongFormLibraryItem;
    kind: 'audiobook';
    score: number;
};
export type RankedEpisode = {
    episode: UnifiedPodcastEpisodeResult;
    kind: 'episode';
    score: number;
};
export type RankedPlaylist = { kind: 'playlist'; playlist: Playlist; score: number };
export type RankedPodcastShow = {
    item: LongFormLibraryItem;
    kind: 'podcastShow';
    score: number;
};
export type RankedRadio = { kind: 'radio'; score: number; station: InternetRadioStation };
export type RankedResult =
    | RankedAlbum
    | RankedArtist
    | RankedAudiobook
    | RankedEpisode
    | RankedPlaylist
    | RankedPodcastShow
    | RankedRadio
    | RankedSong;
export type RankedSong = { kind: 'song'; score: number; song: Song };

export type ResultGroupKey =
    | 'albums'
    | 'artists'
    | 'audiobooks'
    | 'episodes'
    | 'playlists'
    | 'podcastShows'
    | 'radioStations'
    | 'songs';

export type UnifiedPodcastEpisodeResult = {
    episode: LongFormPodcastEpisode;
    show: LongFormLibraryItem;
};

const ENTITY_GROUPS: ReadonlySet<ResultGroupKey> = new Set([
    'albums',
    'artists',
    'audiobooks',
    'playlists',
    'podcastShows',
]);

export interface UnifiedSearchResults {
    albums: RankedAlbum[];
    artists: RankedArtist[];
    audiobooks: RankedAudiobook[];
    episodes: RankedEpisode[];
    playlists: RankedPlaylist[];
    podcastShows: RankedPodcastShow[];
    radioStations: RankedRadio[];
    songs: RankedSong[];
}

export type UnifiedSearchSourceErrors = Partial<Record<UnifiedSearchSourceKey, string>>;
export type UnifiedSearchSourceKey = 'abs' | 'music' | 'playlists' | 'radio';

export interface UnifiedSearchState {
    bestMatches: RankedResult[];
    groupOrder: ResultGroupKey[];
    hasAnyResults: boolean;
    isLoading: boolean;
    results: UnifiedSearchResults;
    sourceErrors: UnifiedSearchSourceErrors;
    totalCount: number;
}

const EMPTY_RESULTS: UnifiedSearchResults = {
    albums: [],
    artists: [],
    audiobooks: [],
    episodes: [],
    playlists: [],
    podcastShows: [],
    radioStations: [],
    songs: [],
};

const getAbsTitle = (item: LongFormLibraryItem) => item.media?.metadata?.title ?? item.name ?? '';

const getAbsAuthor = (item: LongFormLibraryItem) => {
    const meta = item.media?.metadata;
    return meta?.author ?? meta?.authors?.map((author) => author.name).join(', ') ?? '';
};

const entityBumpFor = (kind: ResultGroupKey, ctx: NeedleContext) => {
    if (ctx.needle.length > SHORT_QUERY_THRESHOLD) return 0;
    return ENTITY_GROUPS.has(kind) ? ENTITY_TYPE_BUMP : 0;
};

const rankSongs = (songs: Song[], ctx: NeedleContext): RankedSong[] =>
    songs
        .map<RankedSong>((song) => ({
            kind: 'song',
            score:
                scoreCandidate(
                    song.name,
                    [song.artistName, song.albumArtistName, song.album],
                    ctx.needle,
                    ctx.tokens,
                ) + entityBumpFor('songs', ctx),
            song,
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.song.name.localeCompare(b.song.name))
        .slice(0, RESULT_LIMIT_PER_GROUP);

const rankAlbums = (albums: Album[], ctx: NeedleContext): RankedAlbum[] =>
    albums
        .map<RankedAlbum>((album) => ({
            album,
            kind: 'album',
            score:
                scoreCandidate(album.name, [album.albumArtistName], ctx.needle, ctx.tokens) +
                entityBumpFor('albums', ctx),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.album.name.localeCompare(b.album.name))
        .slice(0, RESULT_LIMIT_PER_GROUP);

/** When the library has an exact artist name match, hide "Artist & …" collab rows. */
const preferPrimaryArtistMatches = (ranked: RankedArtist[], needle: string): RankedArtist[] => {
    const exactMatches = ranked.filter((entry) => normalize(entry.artist.name) === needle);
    if (exactMatches.length > 0) {
        return exactMatches;
    }

    const collaborationPattern = /\s(?:&|feat\.?|ft\.?|vs\.?)\s/i;
    return ranked.filter((entry) => !collaborationPattern.test(entry.artist.name));
};

const rankArtists = (artists: AlbumArtist[], ctx: NeedleContext): RankedArtist[] => {
    const ranked = artists
        .map<RankedArtist>((artist) => ({
            artist,
            kind: 'artist',
            score:
                scoreCandidate(artist.name, [], ctx.needle, ctx.tokens) +
                entityBumpFor('artists', ctx),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.artist.name.localeCompare(b.artist.name));

    return preferPrimaryArtistMatches(ranked, ctx.needle).slice(0, RESULT_LIMIT_PER_GROUP);
};

const rankPlaylists = (playlists: Playlist[], ctx: NeedleContext): RankedPlaylist[] =>
    playlists
        .filter((playlist) => playlist?.id)
        .map<RankedPlaylist>((playlist) => ({
            kind: 'playlist',
            playlist,
            score:
                scoreCandidate(playlist.name, [playlist.owner], ctx.needle, ctx.tokens) +
                entityBumpFor('playlists', ctx),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.playlist.name.localeCompare(b.playlist.name))
        .slice(0, RESULT_LIMIT_PER_GROUP);

const rankRadio = (stations: InternetRadioStation[], ctx: NeedleContext): RankedRadio[] =>
    stations
        .map<RankedRadio>((station) => ({
            kind: 'radio',
            score: scoreCandidate(station.name, [], ctx.needle, ctx.tokens),
            station,
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.station.name.localeCompare(b.station.name))
        .slice(0, RESULT_LIMIT_PER_GROUP);

const rankAudiobooks = (items: LongFormLibraryItem[], ctx: NeedleContext): RankedAudiobook[] =>
    items
        .filter((item) => item.mediaType !== 'podcast')
        .map<RankedAudiobook>((item) => ({
            item,
            kind: 'audiobook',
            score:
                scoreCandidate(
                    getAbsTitle(item),
                    [getAbsAuthor(item), item.media?.metadata?.subtitle],
                    ctx.needle,
                    ctx.tokens,
                ) + entityBumpFor('audiobooks', ctx),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || getAbsTitle(a.item).localeCompare(getAbsTitle(b.item)))
        .slice(0, RESULT_LIMIT_PER_GROUP);

const rankPodcastShows = (items: LongFormLibraryItem[], ctx: NeedleContext): RankedPodcastShow[] =>
    items
        .filter((item) => item.mediaType === 'podcast')
        .map<RankedPodcastShow>((item) => ({
            item,
            kind: 'podcastShow',
            score:
                scoreCandidate(getAbsTitle(item), [getAbsAuthor(item)], ctx.needle, ctx.tokens) +
                entityBumpFor('podcastShows', ctx),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || getAbsTitle(a.item).localeCompare(getAbsTitle(b.item)))
        .slice(0, RESULT_LIMIT_PER_GROUP);

const rankPodcastEpisodes = (items: LongFormLibraryItem[], ctx: NeedleContext): RankedEpisode[] => {
    const candidates: RankedEpisode[] = [];

    for (const item of items) {
        if (item.mediaType !== 'podcast') continue;
        const episodes = item.media?.episodes ?? [];
        for (const episode of episodes) {
            const score = scoreCandidate(
                episode.title,
                [episode.subtitle, getAbsTitle(item)],
                ctx.needle,
                ctx.tokens,
            );
            if (score > 0) {
                candidates.push({ episode: { episode, show: item }, kind: 'episode', score });
            }
        }
    }

    return candidates
        .sort(
            (a, b) =>
                b.score - a.score ||
                (a.episode.episode.title ?? '').localeCompare(b.episode.episode.title ?? ''),
        )
        .slice(0, RESULT_LIMIT_PER_GROUP);
};

const groupMaxScore = (entries: { score: number }[]): number => {
    if (entries.length === 0) return -Infinity;
    return entries[0]!.score;
};

const buildGroupOrder = (results: UnifiedSearchResults): ResultGroupKey[] => {
    const entries: Array<[ResultGroupKey, number]> = [
        ['songs', groupMaxScore(results.songs)],
        ['albums', groupMaxScore(results.albums)],
        ['artists', groupMaxScore(results.artists)],
        ['playlists', groupMaxScore(results.playlists)],
        ['radioStations', groupMaxScore(results.radioStations)],
        ['audiobooks', groupMaxScore(results.audiobooks)],
        ['podcastShows', groupMaxScore(results.podcastShows)],
        ['episodes', groupMaxScore(results.episodes)],
    ];

    return entries
        .filter(([, score]) => Number.isFinite(score))
        .sort(([, a], [, b]) => b - a)
        .map(([key]) => key);
};

const collectBestMatches = (results: UnifiedSearchResults): RankedResult[] => {
    const all: RankedResult[] = [
        ...results.songs,
        ...results.albums,
        ...results.artists,
        ...results.playlists,
        ...results.radioStations,
        ...results.audiobooks,
        ...results.podcastShows,
        ...results.episodes,
    ];

    return all.sort((a, b) => b.score - a.score).slice(0, BEST_MATCHES_LIMIT);
};

const getErrorMessage = (error: unknown): string | undefined => {
    if (!error) return undefined;
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Search source unavailable.';
};

/**
 * Unified search across the music server (Navidrome/Subsonic/Jellyfin),
 * radio stations, and Audiobookshelf libraries (audiobooks, podcasts, episodes).
 *
 * Results are scored and ranked with a small relevance layer so the dropdown
 * surfaces the strongest matches first regardless of media type. Group order
 * follows the highest-scoring entry in each group; empty groups drop out.
 */
export const useUnifiedSearch = (rawQuery: string): UnifiedSearchState => {
    const musicServer = useCurrentServer();
    const longFormMediaServer = useLongFormMediaServer();
    const isSamoLongForm = isSamoLongFormServer(longFormMediaServer);
    const ctx = useMemo(() => buildNeedleContext(rawQuery), [rawQuery]);
    const enabled = ctx.needle.length > 0;

    const musicSearchQuery = useQuery({
        ...searchQueries.search({
            query: {
                albumArtistLimit: RESULT_LIMIT_PER_GROUP,
                albumLimit: RESULT_LIMIT_PER_GROUP,
                query: rawQuery.trim(),
                songLimit: RESULT_LIMIT_PER_GROUP,
            },
            serverId: musicServer?.id ?? '',
        }),
        enabled: enabled && Boolean(musicServer?.id),
        gcTime: 1000 * 60 * 5,
        staleTime: MUSIC_SEARCH_STALE_TIME_MS,
    });

    const playlistsQuery = useQuery({
        ...playlistsQueries.list({
            query: {
                limit: RESULT_LIMIT_PER_GROUP,
                searchTerm: rawQuery.trim(),
                sortBy: PlaylistListSort.NAME,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId: musicServer?.id ?? '',
        }),
        enabled: enabled && Boolean(musicServer?.id),
        gcTime: 1000 * 60 * 5,
        staleTime: MUSIC_SEARCH_STALE_TIME_MS,
    });

    const radioStationsQuery = useQuery({
        enabled: enabled && Boolean(musicServer?.id),
        gcTime: 1000 * 60 * 60,
        queryFn: ({ signal }) =>
            api.controller.getInternetRadioStations({
                apiClientProps: { serverId: musicServer!.id, signal },
            }),
        queryKey: queryKeys.radio.list(musicServer?.id ?? ''),
        staleTime: 1000 * 60 * 5,
    });

    const samoLongFormItemsQuery = useQuery({
        enabled: enabled && isSamoLongForm && Boolean(longFormMediaServer),
        gcTime: ABS_LIBRARY_GC_TIME_MS,
        queryFn: async () => {
            const [audiobooks, podcasts] = await Promise.all([
                listSamoAudiobookLibraryItems(longFormMediaServer!),
                listSamoPodcastLibraryItems(longFormMediaServer!),
            ]);
            return [...audiobooks, ...podcasts];
        },
        queryKey: ['samo', 'search-long-form', longFormMediaServer?.id],
        staleTime: ABS_LIBRARY_STALE_TIME_MS,
    });

    const longFormItems = samoLongFormItemsQuery.data ?? [];

    const hasMusicServer = Boolean(musicServer?.id);
    const hasLongFormServer = Boolean(longFormMediaServer?.id);

    const isLoading =
        enabled &&
        ((hasMusicServer && musicSearchQuery.isPending) ||
            (hasMusicServer && playlistsQuery.isPending) ||
            (hasMusicServer && radioStationsQuery.isPending) ||
            (hasLongFormServer && isSamoLongForm && samoLongFormItemsQuery.isPending));

    const sourceErrors = useMemo<UnifiedSearchSourceErrors>(
        () => ({
            abs: getErrorMessage(samoLongFormItemsQuery.error) ?? undefined,
            music: getErrorMessage(musicSearchQuery.error),
            playlists: getErrorMessage(playlistsQuery.error),
            radio: getErrorMessage(radioStationsQuery.error),
        }),
        [
            samoLongFormItemsQuery.error,
            musicSearchQuery.error,
            playlistsQuery.error,
            radioStationsQuery.error,
        ],
    );

    const results = useMemo<UnifiedSearchResults>(() => {
        if (!enabled) return EMPTY_RESULTS;

        return {
            albums: rankAlbums(musicSearchQuery.data?.albums ?? [], ctx),
            artists: rankArtists(musicSearchQuery.data?.albumArtists ?? [], ctx),
            audiobooks: rankAudiobooks(longFormItems, ctx),
            episodes: rankPodcastEpisodes(longFormItems, ctx),
            playlists: rankPlaylists(playlistsQuery.data?.items ?? [], ctx),
            podcastShows: rankPodcastShows(longFormItems, ctx),
            radioStations: rankRadio(radioStationsQuery.data ?? [], ctx),
            songs: rankSongs(musicSearchQuery.data?.songs ?? [], ctx),
        };
    }, [
        enabled,
        ctx,
        musicSearchQuery.data,
        playlistsQuery.data,
        radioStationsQuery.data,
        longFormItems,
    ]);

    const groupOrder = useMemo(() => buildGroupOrder(results), [results]);
    const bestMatches = useMemo(() => collectBestMatches(results), [results]);

    const totalCount =
        results.songs.length +
        results.albums.length +
        results.artists.length +
        results.playlists.length +
        results.radioStations.length +
        results.audiobooks.length +
        results.podcastShows.length +
        results.episodes.length;

    return {
        bestMatches,
        groupOrder,
        hasAnyResults: totalCount > 0,
        isLoading: Boolean(isLoading),
        results,
        sourceErrors,
        totalCount,
    };
};

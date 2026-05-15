import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';
import { ServerType } from '../server/server-types';
import {
    firstNonEmptyString,
    getMobileContentSource,
    type MobileContentSource,
} from './mobile-content-source';
import {
    buildRadioPlayback,
    buildSubsonicMusicPlayback,
    type MobilePlayableAudio,
} from './mobile-playback';

export enum MobileSearchItemType {
    ALBUM = 'album',
    ARTIST = 'artist',
    AUDIOBOOK = 'audiobook',
    PLAYLIST = 'playlist',
    PODCAST = 'podcast',
    RADIO = 'radio',
    SONG = 'song',
}

export enum MobileSearchSectionId {
    ALBUMS = 'albums',
    ARTISTS = 'artists',
    AUDIOBOOKS = 'audiobooks',
    PLAYLISTS = 'playlists',
    PODCASTS = 'podcasts',
    RADIO = 'radio',
    SONGS = 'songs',
}

export interface MobileSearchAcrossServersInput {
    authentications: ServerAuthenticationResult[];
    fetch?: SamoFetch;
    limit?: number;
    query: string;
    userRecents?: Map<string, number>;
}

export interface MobileSearchInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    limit?: number;
    query: string;
}

export interface MobileSearchItem {
    album?: string;
    albumId?: string;
    artist?: string;
    artistId?: string;
    artworkUrl?: string;
    id: string;
    lastPlayedAt?: number;
    playback?: MobilePlayableAudio;
    playCount?: number;
    source?: MobileContentSource;
    subtitle?: string;
    title: string;
    type: MobileSearchItemType;
}

export interface MobileSearchResults {
    errors: MobileSearchSectionError[];
    query: string;
    searchedAt: number;
    sections: MobileSearchSection[];
}

export interface MobileSearchSection {
    id: MobileSearchSectionId;
    items: MobileSearchItem[];
    title: string;
}

export interface MobileSearchSectionError {
    message: string;
    sectionId: MobileSearchSectionId;
}

interface AudiobookshelfLibrariesBody {
    libraries?: AudiobookshelfLibrary[];
}

interface AudiobookshelfLibrary {
    id?: string;
    mediaType?: string;
    name?: string;
}

interface AudiobookshelfLibraryItem {
    id?: string;
    media?: {
        authorName?: string;
        authors?: Array<{ id?: string; name?: string }>;
        metadata?: {
            author?: string;
            authorName?: string;
            authorNameLF?: string;
            authors?: Array<{ id?: string; name?: string }>;
            imageUrl?: string;
            narratorName?: string;
            narrators?: string[];
            publishedYear?: string;
            title?: string;
        };
        narratorName?: string;
        title?: string;
    };
    name?: string;
    numEpisodes?: number;
}

interface AudiobookshelfLibraryItemsBody {
    results?: AudiobookshelfLibraryItem[];
}

interface SubsonicAlbum {
    artist?: string;
    coverArt?: string;
    id?: number | string;
    name?: string;
    playCount?: number;
    played?: string;
    title?: string;
    year?: number;
}

interface SubsonicArtist {
    albumCount?: number;
    coverArt?: string;
    id?: number | string;
    name?: string;
    playCount?: number;
    played?: string;
}

interface SubsonicError {
    message?: string;
}

interface SubsonicPlaylist {
    coverArt?: string;
    id?: number | string;
    name?: string;
    owner?: string;
    songCount?: number;
}

interface SubsonicPlaylistsBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        playlists?: {
            playlist?: SubsonicPlaylist[];
        };
        status?: string;
    };
}

interface SubsonicRadioBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        internetRadioStations?: {
            internetRadioStation?: SubsonicRadioStation[];
        };
        status?: string;
    };
}

interface SubsonicTopSongsBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        status?: string;
        topSongs?: {
            song?: SubsonicSong[];
        };
    };
}

interface SubsonicRadioStation {
    coverArt?: string;
    homepageUrl?: string;
    id?: string;
    name?: string;
    streamUrl?: string;
}

interface SubsonicSearchBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        searchResult3?: {
            album?: SubsonicAlbum[];
            artist?: SubsonicArtist[];
            song?: SubsonicSong[];
        };
        status?: string;
    };
}

interface SubsonicSong {
    album?: string;
    albumId?: number | string;
    artist?: string;
    artistId?: number | string;
    bitDepth?: number;
    bitRate?: number;
    channelCount?: number;
    contentType?: string;
    coverArt?: string;
    id?: number | string;
    parent?: number | string;
    playCount?: number;
    played?: string;
    samplingRate?: number;
    suffix?: string;
    title?: string;
}

const DEFAULT_SEARCH_LIMIT = 8;

const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Search failed';
};

export const getMobileSearchErrorMessage = getErrorMessage;

const hasItems = (section: MobileSearchSection) => section.items.length > 0;

const includesQuery = (value: string | undefined, query: string) => {
    return value?.toLowerCase().includes(query.toLowerCase()) ?? false;
};

const parseIsoTimestamp = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const getAudiobookshelfTitle = (item: AudiobookshelfLibraryItem, fallback: string) => {
    return firstNonEmptyString(item.media?.metadata?.title, item.media?.title, item.name, fallback);
};

const getAudiobookshelfPodcastTitle = (item: AudiobookshelfLibraryItem) => {
    return firstNonEmptyString(
        item.name,
        item.media?.metadata?.title,
        item.media?.title,
        'Podcast',
    );
};

const getAudiobookshelfAuthor = (item: AudiobookshelfLibraryItem) => {
    const metadata = item.media?.metadata;

    return firstNonEmptyString(
        metadata?.authorName,
        metadata?.authorNameLF,
        metadata?.author,
        metadata?.authors
            ?.map((author) => author.name)
            .filter(Boolean)
            .join(', '),
        item.media?.authorName,
        item.media?.authors
            ?.map((author) => author.name)
            .filter(Boolean)
            .join(', '),
        item.media?.narratorName,
    );
};

const getAudiobookshelfSearchText = (item: AudiobookshelfLibraryItem) => {
    const metadata = item.media?.metadata;

    return [
        getAudiobookshelfTitle(item, ''),
        getAudiobookshelfAuthor(item),
        metadata?.narratorName,
        metadata?.narrators?.join(' '),
        metadata?.publishedYear,
        item.name,
    ]
        .filter(Boolean)
        .join(' ');
};

const subsonicUrl = (
    authentication: ServerAuthenticationResult,
    path: string,
    query: Record<string, number | string> = {},
) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });

    for (const [key, value] of Object.entries(query)) {
        params.set(key, String(value));
    }

    return `${authentication.url}/rest/${path}?${params.toString()}&${authentication.credential}`;
};

const subsonicCoverArtUrl = (
    authentication: ServerAuthenticationResult,
    coverArt: string | undefined,
) => {
    if (!coverArt) {
        return undefined;
    }

    return subsonicUrl(authentication, 'getCoverArt.view', { id: coverArt, size: 320 });
};

// Match-quality tiers, descending. Used to bubble obvious matches (a query that
// IS an artist name) above incidental ones (songs that merely contain the query).
const SCORE_TITLE_EXACT = 100;
const SCORE_TITLE_PREFIX = 80;
const SCORE_TITLE_WORD_PREFIX = 60;
const SCORE_TITLE_SUBSTRING = 40;
const SCORE_SUBTITLE_PREFIX = 30;
const SCORE_SUBTITLE_SUBSTRING = 15;

// Popularity and personal-recency weights cap the influence either signal can
// have, so a niche exact-title match still beats a popular near-miss.
const POPULARITY_WEIGHT = 6;
const POPULARITY_CAP = 30;
const USER_RECENCY_MAX_BOOST = 28;
// Same window we keep recent items in storage; anything older counts as cold.
const USER_RECENCY_HORIZON_MS = 30 * 24 * 60 * 60 * 1000;

export interface MobileSearchRankingContext {
    userRecents?: Map<string, number>;
}

export const getMobileSearchItemKey = (item: {
    id: string;
    source?: { id: string };
    type: string;
}) => `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;

const scorePopularity = (item: MobileSearchItem) => {
    const playCount = item.playCount ?? 0;
    if (playCount <= 0) return 0;
    // log-scaled so 100k plays doesn't drown out match quality entirely.
    return Math.min(POPULARITY_CAP, Math.log10(playCount + 1) * POPULARITY_WEIGHT);
};

const scoreUserRecency = (
    item: MobileSearchItem,
    userRecents: Map<string, number> | undefined,
    now: number,
) => {
    if (!userRecents) return 0;
    const selectedAt = userRecents.get(getMobileSearchItemKey(item));
    if (!selectedAt) return 0;
    const age = Math.max(0, now - selectedAt);
    if (age >= USER_RECENCY_HORIZON_MS) return 0;
    // Fresh selections lift items hard; the boost decays linearly over the window.
    return Math.round(USER_RECENCY_MAX_BOOST * (1 - age / USER_RECENCY_HORIZON_MS));
};

const scoreMatch = (item: MobileSearchItem, normalizedQuery: string) => {
    if (!normalizedQuery) return 0;
    const title = item.title.toLowerCase();
    const subtitle = item.subtitle?.toLowerCase() ?? '';

    if (title === normalizedQuery) return SCORE_TITLE_EXACT;
    if (title.startsWith(normalizedQuery)) return SCORE_TITLE_PREFIX;
    if (title.split(/\s+/).some((word) => word.startsWith(normalizedQuery))) {
        return SCORE_TITLE_WORD_PREFIX;
    }
    if (title.includes(normalizedQuery)) return SCORE_TITLE_SUBSTRING;
    if (subtitle.startsWith(normalizedQuery)) return SCORE_SUBTITLE_PREFIX;
    if (subtitle.includes(normalizedQuery)) return SCORE_SUBTITLE_SUBSTRING;
    return 0;
};

const scoreSearchItem = (
    item: MobileSearchItem,
    normalizedQuery: string,
    userRecents: Map<string, number> | undefined,
    now: number,
) => {
    const match = scoreMatch(item, normalizedQuery);
    if (match === 0) return 0;
    return match + scorePopularity(item) + scoreUserRecency(item, userRecents, now);
};

const rankSearchSections = (
    query: string,
    sections: MobileSearchSection[],
    context: MobileSearchRankingContext | undefined,
): MobileSearchSection[] => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sections;
    const now = Date.now();
    const userRecents = context?.userRecents;

    const scored = sections.map((section) => {
        const items = section.items
            .map((item) => ({ item, score: scoreSearchItem(item, normalizedQuery, userRecents, now) }))
            .sort((left, right) => right.score - left.score);
        const topScore = items[0]?.score ?? 0;
        return { section: { ...section, items: items.map(({ item }) => item) }, topScore };
    });

    scored.sort((left, right) => right.topScore - left.topScore);
    return scored.map(({ section }) => section);
};

const toSearchResults = (
    query: string,
    sections: MobileSearchSection[],
    errors: MobileSearchSectionError[] = [],
    context?: MobileSearchRankingContext,
): MobileSearchResults => ({
    errors,
    query,
    searchedAt: Date.now(),
    sections: rankSearchSections(query, sections.filter(hasItems), context),
});

const loadAudiobookshelfSearch = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    query: string,
    limit: number,
): Promise<MobileSearchResults> => {
    const librariesBody = await requestJson<AudiobookshelfLibrariesBody>(
        fetcher,
        `${authentication.url}/api/libraries`,
        {
            headers: { Authorization: `Bearer ${authentication.credential}` },
            method: 'GET',
        },
    );
    const libraries = librariesBody.libraries ?? [];
    const libraryResults = await Promise.allSettled(
        libraries.map(async (library) => {
            if (!library.id) {
                return { items: [], library };
            }

            const body = await requestJson<AudiobookshelfLibraryItemsBody>(
                fetcher,
                `${authentication.url}/api/libraries/${library.id}/items`,
                {
                    headers: { Authorization: `Bearer ${authentication.credential}` },
                    method: 'GET',
                },
            );

            return { items: body.results ?? [], library };
        }),
    );

    const errors = libraryResults.flatMap((result) =>
        result.status === 'rejected'
            ? [
                  {
                      message: getErrorMessage(result.reason),
                      sectionId: MobileSearchSectionId.AUDIOBOOKS,
                  },
              ]
            : [],
    );
    const items = libraryResults.flatMap((result) =>
        result.status === 'fulfilled'
            ? result.value.items.map((item) => ({ ...item, library: result.value.library }))
            : [],
    );

    const audiobookItems = items
        .filter(({ library }) => library.mediaType === 'book')
        .filter((item) => includesQuery(getAudiobookshelfSearchText(item), query))
        .slice(0, limit)
        .map<MobileSearchItem>((item) => {
            const { id, library } = item;

            return {
                artworkUrl: id
                    ? (item.media?.metadata?.imageUrl ??
                      `${authentication.url}/api/items/${id}/cover?token=${encodeURIComponent(authentication.credential)}`)
                    : undefined,
                id: id ?? `${library.id}-${item.name}`,
                source: getMobileContentSource(authentication),
                subtitle: getAudiobookshelfAuthor(item),
                title: getAudiobookshelfTitle(item, 'Untitled audiobook') ?? 'Untitled audiobook',
                type: MobileSearchItemType.AUDIOBOOK,
            };
        });
    const podcastItems = items
        .filter(({ library }) => library.mediaType === 'podcast')
        .filter((item) => includesQuery(getAudiobookshelfSearchText(item), query))
        .slice(0, limit)
        .map<MobileSearchItem>((item) => {
            const { id, library, numEpisodes } = item;

            return {
                artworkUrl: id
                    ? (item.media?.metadata?.imageUrl ??
                      `${authentication.url}/api/items/${id}/cover?token=${encodeURIComponent(authentication.credential)}`)
                    : undefined,
                id: id ?? `${library.id}-${item.name}`,
                source: getMobileContentSource(authentication),
                subtitle: numEpisodes ? `${numEpisodes} episodes` : library.name,
                title: getAudiobookshelfPodcastTitle(item) ?? 'Podcast',
                type: MobileSearchItemType.PODCAST,
            };
        });

    return toSearchResults(
        query,
        [
            { id: MobileSearchSectionId.AUDIOBOOKS, items: audiobookItems, title: 'Audiobooks' },
            { id: MobileSearchSectionId.PODCASTS, items: podcastItems, title: 'Podcasts' },
        ],
        errors,
    );
};

const fetchSubsonicTopSongsForArtist = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    artistName: string,
    count: number,
): Promise<SubsonicSong[]> => {
    try {
        const body = await requestJson<SubsonicTopSongsBody>(
            fetcher,
            subsonicUrl(authentication, 'getTopSongs.view', { artist: artistName, count }),
        );
        const response = body['subsonic-response'];
        if (response?.status !== 'ok') return [];
        return response.topSongs?.song ?? [];
    } catch {
        // Top songs is best-effort. Some servers don't implement it or the artist
        // isn't indexed by last.fm; in either case the regular search results are
        // still good enough to show.
        return [];
    }
};

// Max number of artists whose top tracks we'll request alongside a search.
// Two is enough to cover both an exact match and a runner-up without flooding
// the server.
const TOP_SONGS_ARTIST_FANOUT = 2;

const loadSubsonicSearch = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    query: string,
    limit: number,
): Promise<MobileSearchResults> => {
    const [searchResult, playlistResult, radioResult] = await Promise.allSettled([
        requestJson<SubsonicSearchBody>(
            fetcher,
            subsonicUrl(authentication, 'search3.view', {
                albumCount: limit,
                artistCount: limit,
                query,
                songCount: limit,
            }),
        ),
        requestJson<SubsonicPlaylistsBody>(
            fetcher,
            subsonicUrl(authentication, 'getPlaylists.view'),
        ),
        requestJson<SubsonicRadioBody>(
            fetcher,
            subsonicUrl(authentication, 'getInternetRadioStations.view'),
        ),
    ]);

    if (searchResult.status === 'rejected') {
        throw searchResult.reason;
    }

    const response = searchResult.value['subsonic-response'];

    if (response?.status !== 'ok') {
        throw new Error(response?.error?.message ?? 'Search failed');
    }

    const errors: MobileSearchSectionError[] = [];

    // If the query strongly resembles an artist name, fan out and grab that
    // artist's top tracks. The popularity-aware ranker will then float those
    // above the songs that merely contain the query string.
    const normalizedQuery = query.trim().toLowerCase();
    const matchedArtists = (response.searchResult3?.artist ?? [])
        .filter((artist) => artist.name && scoreMatch(
            { id: '', subtitle: undefined, title: artist.name, type: MobileSearchItemType.ARTIST },
            normalizedQuery,
        ) >= SCORE_TITLE_WORD_PREFIX)
        .slice(0, TOP_SONGS_ARTIST_FANOUT);
    const topSongResults = await Promise.all(
        matchedArtists.map((artist) =>
            fetchSubsonicTopSongsForArtist(authentication, fetcher, artist.name!, limit),
        ),
    );
    const rawSongs = response.searchResult3?.song ?? [];
    const seenSongIds = new Set<string>();
    const mergedSongs: SubsonicSong[] = [];
    for (const song of [...rawSongs, ...topSongResults.flat()]) {
        const id = song.id?.toString();
        if (!id || seenSongIds.has(id)) continue;
        seenSongIds.add(id);
        mergedSongs.push(song);
    }

    if (playlistResult.status === 'rejected') {
        errors.push({
            message: getErrorMessage(playlistResult.reason),
            sectionId: MobileSearchSectionId.PLAYLISTS,
        });
    }

    if (radioResult.status === 'rejected') {
        errors.push({
            message: getErrorMessage(radioResult.reason),
            sectionId: MobileSearchSectionId.RADIO,
        });
    }

    const playlistsResponse =
        playlistResult.status === 'fulfilled'
            ? playlistResult.value['subsonic-response']
            : undefined;
    const radioResponse =
        radioResult.status === 'fulfilled' ? radioResult.value['subsonic-response'] : undefined;

    return toSearchResults(
        query,
        [
            {
                id: MobileSearchSectionId.SONGS,
                items: mergedSongs.flatMap((song) => {
                    const id = song.id?.toString();
                    const artworkUrl = subsonicCoverArtUrl(authentication, song.coverArt);
                    const playback = buildSubsonicMusicPlayback(authentication, song, artworkUrl);

                    if (!id || !song.title) {
                        return [];
                    }

                    return {
                        album: song.album,
                        albumId: song.albumId?.toString() ?? song.parent?.toString(),
                        artist: song.artist,
                        artistId: song.artistId?.toString(),
                        artworkUrl,
                        id,
                        lastPlayedAt: parseIsoTimestamp(song.played),
                        playback: playback ?? undefined,
                        playCount: song.playCount,
                        source: getMobileContentSource(authentication),
                        subtitle: [song.artist, song.album].filter(Boolean).join(' - '),
                        title: song.title,
                        type: MobileSearchItemType.SONG,
                    };
                }),
                title: 'Songs',
            },
            {
                id: MobileSearchSectionId.ALBUMS,
                items: (response.searchResult3?.album ?? []).flatMap((album) => {
                    const id = album.id?.toString();
                    const title = album.name ?? album.title;

                    if (!id || !title) {
                        return [];
                    }

                    return {
                        artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt),
                        id,
                        lastPlayedAt: parseIsoTimestamp(album.played),
                        playCount: album.playCount,
                        source: getMobileContentSource(authentication),
                        subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
                        title,
                        type: MobileSearchItemType.ALBUM,
                    };
                }),
                title: 'Albums',
            },
            {
                id: MobileSearchSectionId.ARTISTS,
                items: (response.searchResult3?.artist ?? []).flatMap((artist) => {
                    const id = artist.id?.toString();

                    if (!id || !artist.name) {
                        return [];
                    }

                    return {
                        artworkUrl: subsonicCoverArtUrl(authentication, artist.coverArt),
                        id,
                        lastPlayedAt: parseIsoTimestamp(artist.played),
                        playCount: artist.playCount,
                        source: getMobileContentSource(authentication),
                        subtitle: artist.albumCount ? `${artist.albumCount} albums` : undefined,
                        title: artist.name,
                        type: MobileSearchItemType.ARTIST,
                    };
                }),
                title: 'Artists',
            },
            {
                id: MobileSearchSectionId.PLAYLISTS,
                items: (playlistsResponse?.playlists?.playlist ?? [])
                    .filter((playlist) => includesQuery(playlist.name, query))
                    .slice(0, limit)
                    .flatMap((playlist) => {
                        const id = playlist.id?.toString();

                        if (!id || !playlist.name) {
                            return [];
                        }

                        return {
                            artworkUrl: subsonicCoverArtUrl(authentication, playlist.coverArt),
                            id,
                            source: getMobileContentSource(authentication),
                            subtitle: playlist.songCount
                                ? `${playlist.songCount} songs`
                                : playlist.owner,
                            title: playlist.name,
                            type: MobileSearchItemType.PLAYLIST,
                        };
                    }),
                title: 'Playlists',
            },
            {
                id: MobileSearchSectionId.RADIO,
                items: (radioResponse?.internetRadioStations?.internetRadioStation ?? [])
                    .filter((station) => includesQuery(station.name, query))
                    .slice(0, limit)
                    .flatMap((station) => {
                        const artworkUrl = subsonicCoverArtUrl(authentication, station.coverArt);
                        const playback = buildRadioPlayback(authentication, station, artworkUrl);

                        if (!station.id || !station.name) {
                            return [];
                        }

                        return {
                            artworkUrl,
                            id: station.id,
                            playback: playback ?? undefined,
                            source: getMobileContentSource(authentication),
                            subtitle: station.homepageUrl ?? station.streamUrl,
                            title: station.name,
                            type: MobileSearchItemType.RADIO,
                        };
                    }),
                title: 'Radio',
            },
        ],
        errors,
    );
};

export const searchMobileContent = async ({
    authentication,
    fetch: fetcher,
    limit = DEFAULT_SEARCH_LIMIT,
    query,
}: MobileSearchInput): Promise<MobileSearchResults> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return toSearchResults('', []);
    }

    const request = getFetch(fetcher);

    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        return loadAudiobookshelfSearch(authentication, request, trimmedQuery, limit);
    }

    if (
        authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC
    ) {
        return loadSubsonicSearch(authentication, request, trimmedQuery, limit);
    }

    throw new Error('Search is not wired for this server type');
};

const getSearchFailureSectionId = (authentication: ServerAuthenticationResult) => {
    return authentication.type === ServerType.AUDIOBOOKSHELF
        ? MobileSearchSectionId.AUDIOBOOKS
        : MobileSearchSectionId.SONGS;
};

export const searchMobileContentAcrossServers = async ({
    authentications,
    fetch: fetcher,
    limit = DEFAULT_SEARCH_LIMIT,
    query,
    userRecents,
}: MobileSearchAcrossServersInput): Promise<MobileSearchResults> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || authentications.length === 0) {
        return toSearchResults(trimmedQuery, []);
    }

    const request = getFetch(fetcher);
    const searchLoads = await Promise.allSettled(
        authentications.map((authentication) =>
            searchMobileContent({ authentication, fetch: request, limit, query: trimmedQuery }),
        ),
    );
    const sectionsById = new Map<MobileSearchSectionId, MobileSearchSection>();
    const errors: MobileSearchSectionError[] = [];
    let fulfilledCount = 0;

    searchLoads.forEach((result, index) => {
        const authentication = authentications[index];

        if (result.status === 'rejected') {
            errors.push({
                message: `${authentication.title}: ${getErrorMessage(result.reason)}`,
                sectionId: getSearchFailureSectionId(authentication),
            });
            return;
        }

        fulfilledCount += 1;
        errors.push(...result.value.errors);

        result.value.sections.forEach((section) => {
            const existingSection = sectionsById.get(section.id);

            if (existingSection) {
                existingSection.items.push(...section.items);
                return;
            }

            sectionsById.set(section.id, { ...section, items: [...section.items] });
        });
    });

    if (fulfilledCount === 0) {
        throw new Error(errors[0]?.message ?? 'Search failed');
    }

    return toSearchResults(
        trimmedQuery,
        [...sectionsById.values()],
        errors,
        { userRecents },
    );
};

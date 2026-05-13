import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';
import { ServerType } from '../server/server-types';
import {
    firstNonEmptyString,
    getMobileContentSource,
    type MobileContentSource,
} from './mobile-content-source';

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
}

export interface MobileSearchInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    limit?: number;
    query: string;
}

export interface MobileSearchItem {
    artworkUrl?: string;
    id: string;
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
    title?: string;
    year?: number;
}

interface SubsonicArtist {
    albumCount?: number;
    coverArt?: string;
    id?: number | string;
    name?: string;
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
    artist?: string;
    coverArt?: string;
    id?: number | string;
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

const toSearchResults = (
    query: string,
    sections: MobileSearchSection[],
    errors: MobileSearchSectionError[] = [],
): MobileSearchResults => ({
    errors,
    query,
    searchedAt: Date.now(),
    sections: sections.filter(hasItems),
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
                items: (response.searchResult3?.song ?? []).flatMap((song) => {
                    const id = song.id?.toString();

                    if (!id || !song.title) {
                        return [];
                    }

                    return {
                        artworkUrl: subsonicCoverArtUrl(authentication, song.coverArt),
                        id,
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
                        if (!station.id || !station.name) {
                            return [];
                        }

                        return {
                            artworkUrl: subsonicCoverArtUrl(authentication, station.coverArt),
                            id: station.id,
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

    return toSearchResults(trimmedQuery, [...sectionsById.values()], errors);
};

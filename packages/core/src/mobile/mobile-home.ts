import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';
import { ServerType } from '../server/server-types';
import {
    buildAudiobookshelfArtworkUrl,
    firstNonEmptyString,
    getMobileContentSource,
    type MobileContentSource,
} from './mobile-content-source';
import { buildRadioPlayback, type MobilePlayableAudio } from './mobile-playback';

export enum MobileHomeItemType {
    ALBUM = 'album',
    ARTIST = 'artist',
    AUDIOBOOK = 'audiobook',
    PLAYLIST = 'playlist',
    PODCAST = 'podcast',
    RADIO = 'radio',
}

export enum MobileHomeSectionId {
    AUDIOBOOKS = 'audiobooks',
    FAVORITE_ALBUMS = 'favorite-albums',
    FAVORITE_ARTISTS = 'favorite-artists',
    PLAYLISTS = 'playlists',
    PODCASTS = 'podcasts',
    RADIO = 'radio',
    RECENTLY_ADDED = 'recently-added',
}

export interface MobileHomeContent {
    errors: MobileHomeSectionError[];
    loadedAt: number;
    sections: MobileHomeSection[];
    serverTitle: string;
}

export interface MobileHomeContentForServersInput {
    authentications: ServerAuthenticationResult[];
    fetch?: SamoFetch;
    limit?: number;
}

export interface MobileHomeContentInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    limit?: number;
}

export interface MobileHomeItem {
    artworkUrl?: string;
    id: string;
    playback?: MobilePlayableAudio;
    source?: MobileContentSource;
    subtitle?: string;
    title: string;
    type: MobileHomeItemType;
}

export interface MobileHomeSection {
    id: MobileHomeSectionId;
    items: MobileHomeItem[];
    title: string;
}

export interface MobileHomeSectionError {
    message: string;
    sectionId: MobileHomeSectionId;
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

interface SubsonicAlbumListBody {
    'subsonic-response'?: {
        albumList2?: {
            album?: SubsonicAlbum[];
        };
        error?: SubsonicError;
        status?: string;
    };
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

interface SubsonicStarred2Body {
    'subsonic-response'?: {
        error?: SubsonicError;
        starred2?: {
            album?: SubsonicAlbum[];
            artist?: SubsonicArtist[];
        };
        status?: string;
    };
}

const DEFAULT_HOME_LIMIT = 12;

const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Request failed';
};

export const getMobileHomeContentErrorMessage = getErrorMessage;

const hasItems = (section: MobileHomeSection) => section.items.length > 0;

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

const assertSubsonicOk = (
    response: undefined | { error?: SubsonicError; status?: string },
    fallback: string,
) => {
    if (response?.status === 'ok') {
        return;
    }

    throw new Error(response?.error?.message ?? fallback);
};

const toSectionErrors = (sectionLoads: PromiseSettledResult<MobileHomeSection>[]) => {
    return sectionLoads.flatMap((result) =>
        result.status === 'rejected'
            ? [
                  {
                      message: getErrorMessage(result.reason),
                      sectionId: MobileHomeSectionId.RECENTLY_ADDED,
                  },
              ]
            : [],
    );
};

const toHomeContent = (
    authentication: ServerAuthenticationResult,
    sectionLoads: PromiseSettledResult<MobileHomeSection>[],
): MobileHomeContent => ({
    errors: toSectionErrors(sectionLoads),
    loadedAt: Date.now(),
    sections: sectionLoads.flatMap((result) =>
        result.status === 'fulfilled' && hasItems(result.value) ? [result.value] : [],
    ),
    serverTitle: authentication.title,
});

const loadAudiobookshelfItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    library: AudiobookshelfLibrary,
    itemType: MobileHomeItemType.AUDIOBOOK | MobileHomeItemType.PODCAST,
    limit: number,
): Promise<MobileHomeItem[]> => {
    if (!library.id) {
        return [];
    }

    const params = new URLSearchParams({ desc: '1', limit: String(limit), sort: 'addedAt' });
    const body = await requestJson<AudiobookshelfLibraryItemsBody>(
        fetcher,
        `${authentication.url}/api/libraries/${library.id}/items?${params.toString()}`,
        {
            headers: { Authorization: `Bearer ${authentication.credential}` },
            method: 'GET',
        },
    );

    return (body.results ?? []).flatMap((item) => {
        if (!item.id) {
            return [];
        }

        const title =
            itemType === MobileHomeItemType.PODCAST
                ? getAudiobookshelfPodcastTitle(item)
                : getAudiobookshelfTitle(item, 'Untitled audiobook');
        if (!title) {
            return [];
        }

        const source = getMobileContentSource(authentication);

        return {
            artworkUrl: buildAudiobookshelfArtworkUrl(
                authentication,
                item.id,
                item.media?.metadata?.imageUrl,
            ),
            id: item.id,
            source,
            subtitle:
                itemType === MobileHomeItemType.AUDIOBOOK
                    ? getAudiobookshelfAuthor(item)
                    : item.numEpisodes
                      ? `${item.numEpisodes} episodes`
                      : library.name,
            title,
            type: itemType,
        };
    });
};

const loadAudiobookshelfHomeContent = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    limit: number,
): Promise<MobileHomeContent> => {
    const librariesBody = await requestJson<AudiobookshelfLibrariesBody>(
        fetcher,
        `${authentication.url}/api/libraries`,
        {
            headers: { Authorization: `Bearer ${authentication.credential}` },
            method: 'GET',
        },
    );
    const libraries = librariesBody.libraries ?? [];
    const bookLibraries = libraries.filter((library) => library.mediaType === 'book');
    const podcastLibraries = libraries.filter((library) => library.mediaType === 'podcast');
    const sectionLoads = await Promise.allSettled([
        Promise.all(
            bookLibraries.map((library) =>
                loadAudiobookshelfItems(
                    authentication,
                    fetcher,
                    library,
                    MobileHomeItemType.AUDIOBOOK,
                    limit,
                ),
            ),
        ).then((items) => ({
            id: MobileHomeSectionId.AUDIOBOOKS,
            items: items.flat().slice(0, limit),
            title: 'Audiobooks',
        })),
        Promise.all(
            podcastLibraries.map((library) =>
                loadAudiobookshelfItems(
                    authentication,
                    fetcher,
                    library,
                    MobileHomeItemType.PODCAST,
                    limit,
                ),
            ),
        ).then((items) => ({
            id: MobileHomeSectionId.PODCASTS,
            items: items.flat().slice(0, limit),
            title: 'Podcasts',
        })),
    ]);

    return toHomeContent(authentication, sectionLoads);
};

const loadSubsonicAlbums = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    limit: number,
): Promise<MobileHomeSection> => {
    const body = await requestJson<SubsonicAlbumListBody>(
        fetcher,
        subsonicUrl(authentication, 'getAlbumList2.view', {
            size: limit,
            type: 'newest',
        }),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load albums');

    return {
        id: MobileHomeSectionId.RECENTLY_ADDED,
        items: (response?.albumList2?.album ?? []).flatMap((album) => {
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
                type: MobileHomeItemType.ALBUM,
            };
        }),
        title: 'Recently Added',
    };
};

const loadSubsonicFavoriteAlbumsAndArtists = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    limit: number,
): Promise<MobileHomeSection[]> => {
    const body = await requestJson<SubsonicStarred2Body>(
        fetcher,
        subsonicUrl(authentication, 'getStarred2.view'),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load favorites');
    const source = getMobileContentSource(authentication);
    const favoriteAlbums: MobileHomeItem[] = (response?.starred2?.album ?? [])
        .slice(0, limit)
        .flatMap((album) => {
            const id = album.id?.toString();
            const title = album.name ?? album.title;

            if (!id || !title) {
                return [];
            }

            return {
                artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt),
                id,
                source,
                subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
                title,
                type: MobileHomeItemType.ALBUM,
            };
        });
    const favoriteArtists: MobileHomeItem[] = (response?.starred2?.artist ?? [])
        .slice(0, limit)
        .flatMap((artist) => {
            const id = artist.id?.toString();

            if (!id || !artist.name) {
                return [];
            }

            return {
                artworkUrl: subsonicCoverArtUrl(authentication, artist.coverArt),
                id,
                source,
                subtitle: artist.albumCount ? `${artist.albumCount} albums` : undefined,
                title: artist.name,
                type: MobileHomeItemType.ARTIST,
            };
        });

    return [
        { id: MobileHomeSectionId.FAVORITE_ALBUMS, items: favoriteAlbums, title: 'Favorite Albums' },
        {
            id: MobileHomeSectionId.FAVORITE_ARTISTS,
            items: favoriteArtists,
            title: 'Favorite Artists',
        },
    ].filter(hasItems);
};

const loadSubsonicPlaylists = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeSection> => {
    const body = await requestJson<SubsonicPlaylistsBody>(
        fetcher,
        subsonicUrl(authentication, 'getPlaylists.view'),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load playlists');

    return {
        id: MobileHomeSectionId.PLAYLISTS,
        items: (response?.playlists?.playlist ?? []).flatMap((playlist) => {
            const id = playlist.id?.toString();

            if (!id || !playlist.name) {
                return [];
            }

            return {
                artworkUrl: subsonicCoverArtUrl(authentication, playlist.coverArt),
                id,
                source: getMobileContentSource(authentication),
                subtitle: playlist.songCount ? `${playlist.songCount} songs` : playlist.owner,
                title: playlist.name,
                type: MobileHomeItemType.PLAYLIST,
            };
        }),
        title: 'Playlists',
    };
};

const loadSubsonicRadio = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeSection> => {
    const body = await requestJson<SubsonicRadioBody>(
        fetcher,
        subsonicUrl(authentication, 'getInternetRadioStations.view'),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load radio stations');

    return {
        id: MobileHomeSectionId.RADIO,
        items: (response?.internetRadioStations?.internetRadioStation ?? []).flatMap((station) => {
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
                type: MobileHomeItemType.RADIO,
            };
        }),
        title: 'Radio',
    };
};

const loadSubsonicHomeContent = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    limit: number,
): Promise<MobileHomeContent> => {
    const [favoritesResult, ...sectionLoads] = await Promise.allSettled([
        loadSubsonicFavoriteAlbumsAndArtists(authentication, fetcher, limit),
        loadSubsonicAlbums(authentication, fetcher, limit),
        loadSubsonicPlaylists(authentication, fetcher),
        loadSubsonicRadio(authentication, fetcher),
    ]);

    const favoriteLoads: PromiseSettledResult<MobileHomeSection>[] =
        favoritesResult.status === 'fulfilled'
            ? favoritesResult.value.map((section) => ({
                  status: 'fulfilled' as const,
                  value: section,
              }))
            : [
                  {
                      reason: favoritesResult.reason,
                      status: 'rejected' as const,
                  },
              ];

    return toHomeContent(authentication, [...favoriteLoads, ...sectionLoads]);
};

export const loadMobileHomeContent = async ({
    authentication,
    fetch: fetcher,
    limit = DEFAULT_HOME_LIMIT,
}: MobileHomeContentInput): Promise<MobileHomeContent> => {
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        return loadAudiobookshelfHomeContent(authentication, request, limit);
    }

    if (
        authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC
    ) {
        return loadSubsonicHomeContent(authentication, request, limit);
    }

    throw new Error('Home content is not wired for this server type');
};

const getHomeFailureSectionId = (authentication: ServerAuthenticationResult) => {
    return authentication.type === ServerType.AUDIOBOOKSHELF
        ? MobileHomeSectionId.AUDIOBOOKS
        : MobileHomeSectionId.RECENTLY_ADDED;
};

export const loadMobileHomeContentForServers = async ({
    authentications,
    fetch: fetcher,
    limit = DEFAULT_HOME_LIMIT,
}: MobileHomeContentForServersInput): Promise<MobileHomeContent> => {
    const loadedAt = Date.now();

    if (authentications.length === 0) {
        return {
            errors: [],
            loadedAt,
            sections: [],
            serverTitle: '',
        };
    }

    const request = getFetch(fetcher);
    const contentLoads = await Promise.allSettled(
        authentications.map((authentication) =>
            loadMobileHomeContent({ authentication, fetch: request, limit }),
        ),
    );
    const sectionsById = new Map<MobileHomeSectionId, MobileHomeSection>();
    const errors: MobileHomeSectionError[] = [];
    let fulfilledCount = 0;

    contentLoads.forEach((result, index) => {
        const authentication = authentications[index];

        if (result.status === 'rejected') {
            errors.push({
                message: `${authentication.title}: ${getErrorMessage(result.reason)}`,
                sectionId: getHomeFailureSectionId(authentication),
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
        throw new Error(errors[0]?.message ?? 'Failed to load Home content');
    }

    return {
        errors,
        loadedAt,
        sections: [...sectionsById.values()].filter(hasItems),
        serverTitle: authentications.map((authentication) => authentication.title).join(' + '),
    };
};

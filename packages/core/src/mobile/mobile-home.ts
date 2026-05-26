import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';
import {
    type SamoAudiobook,
    type SamoInternetRadioStation,
    type SamoMusicAlbum,
    type SamoMusicArtist,
    type SamoMusicPlaylist,
    type SamoMusicTrack,
    type SamoPaginatedResponse,
    type SamoPodcast,
    type SamoProgrammedRadioStation,
    getSamoMusicBrowse,
    listSamoAudiobooks,
    listSamoInternetRadioStations,
    listSamoMusicAlbums,
    listSamoMusicArtists,
    listSamoMusicPlaylists,
    listSamoMusicTracks,
    listSamoPodcasts,
    listSamoProgrammedRadioStations,
    pickSamoImageId,
    pickSamoCatalogImageId,
    resolveSamoAlbumArtworkUrl,
    resolveSamoArtistArtworkUrl,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPlaylistArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    resolveSamoStationArtworkUrl,
    samoItemsOf,
} from '../server/server-samo';
import { ensureSamoStreamToken, getCachedSamoStreamToken } from '../server/server-samo-stream-token';
import { ServerType } from '../server/server-types';
import {
    buildAudiobookshelfArtworkUrl,
    firstNonEmptyString,
    getMobileContentSource,
    type MobileContentSource,
} from './mobile-content-source';
import {
    buildRadioPlayback,
    buildSamoInternetRadioPlayback,
    type MobilePlayableAudio,
} from './mobile-playback';
import {
    annotateSubsonicAlbumsQuality,
    annotateSubsonicHiResCollections,
} from './mobile-subsonic-quality';

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
    qualityScanLimit?: number;
}

export interface MobileHomeContentInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    limit?: number;
    qualityScanLimit?: number;
}

export interface MobileHomeItem {
    /**
     * Server-reported "added at" timestamp in epoch milliseconds. Used to
     * sort the cross-source "Recently Added" hero row chronologically rather
     * than round-robining categories — so a newly-added audiobook can land
     * above a music album added two weeks ago. Undefined when the source
     * didn't report a timestamp (eg favorites/starred lists, which we never
     * surface in the Recently Added row anyway).
     */
    addedAt?: number;
    artworkUrl?: string;
    /**
     * Samo-only — `images[].id` from catalog metadata (`cover_*` / `image_*`).
     * Lets tiles rebuild the image URL at display time without persisting
     * expiring stream tokens in list payloads.
     */
    artworkImageId?: string;
    /**
     * Lightweight summary text for audiobook authors / podcast hosts. Samo's
     * audiobook items carry rich contributor records; we surface the joined
     * display string here so tiles can render "Author — Narrator" without
     * needing a detail fetch. Undefined for non-spoken-word items.
     */
    contributorsSummary?: string;
    /**
     * Lifecycle bucket for spoken-word items (audiobooks, podcast episodes).
     * Derived from samo's playback state (progressSeconds vs duration plus
     * the explicit `completed` flag). Music tracks don't carry this — they
     * have play counts instead. Used to drive the "Continue listening" row.
     */
    completionState?: 'completed' | 'in-progress' | 'unplayed';
    /**
     * Total duration in seconds for items whose primary identity is "a thing
     * that plays" — audiobooks, podcast episodes, tracks. Lets the Continue
     * row compute a progress bar without re-fetching detail.
     */
    durationSeconds?: number;
    id: string;
    isHiRes?: boolean;
    /**
     * Internet radio: current StreamTitle reported by the ICY metadata probe.
     * Programmed radio: the currently-airing program slot. Stays undefined
     * for music/audiobook/podcast items.
     */
    nowPlayingText?: string;
    playback?: MobilePlayableAudio;
    /**
     * Resume position in seconds for spoken-word items. Used to draw the
     * progress bar on Continue tiles and as the default `offsetSeconds` when
     * starting playback.
     */
    progressSeconds?: number;
    /**
     * The album / track's representative format — bit depth and sample rate
     * of the highest-quality song in the collection (or the song itself).
     * Populated by annotateSubsonicAlbumsQuality for album items; remains
     * undefined for playlists (always mixed format), artists, audiobooks,
     * podcasts. The UI uses this to pick the matching format-specific
     * badge asset; absent profile = no badge.
     */
    qualityProfile?: MobileQualityProfile;
    /**
     * Audiobook series sequence (e.g. "Book 3 of Lyrik Saga"). Optional —
     * undefined when the audiobook isn't part of a series.
     */
    seriesSummary?: string;
    source?: MobileContentSource;
    subtitle?: string;
    title: string;
    type: MobileHomeItemType;
}

/**
 * @deprecated Use `QualityBadgeProfile` from `@samo/core/audio-quality`.
 * Kept as a type alias so existing Android imports keep working unchanged.
 */
export type MobileQualityProfile =
    import('../audio-quality/quality-badge-key').QualityBadgeProfile;

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
    addedAt?: number;
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
    updatedAt?: number;
}

interface AudiobookshelfLibraryItemsBody {
    results?: AudiobookshelfLibraryItem[];
}

interface SubsonicAlbum {
    artist?: string;
    coverArt?: string;
    /**
     * ISO-8601 timestamp the album was added to the library. Navidrome and
     * stock Subsonic both populate this on getAlbumList2.view; older servers
     * may omit it, in which case the field stays undefined and the item just
     * loses its place in the unified recency sort.
     */
    created?: string;
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
    entityId?: number | string,
) => {
    // Newer Navidrome populates coverArt; older Subsonic-compatible servers
    // sometimes leave it blank even when artwork exists. getCoverArt.view
    // accepts the entity id directly, so fall back to it whenever the
    // explicit coverArt field is missing — produces covers for albums/artists
    // that would otherwise render a fallback letter.
    const target = coverArt ?? (entityId != null ? entityId.toString() : undefined);
    if (!target) {
        return undefined;
    }

    return subsonicUrl(authentication, 'getCoverArt.view', { id: target, size: 320 });
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
            addedAt: item.addedAt,
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
    qualityScanLimit: number,
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

    const items: MobileHomeItem[] = (response?.albumList2?.album ?? []).flatMap((album) => {
        const id = album.id?.toString();
        const title = album.name ?? album.title;

        if (!id || !title) {
            return [];
        }

        const createdMs = album.created ? Date.parse(album.created) : NaN;

        return {
            addedAt: Number.isFinite(createdMs) ? createdMs : undefined,
            artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt, album.id),
            id,
            source: getMobileContentSource(authentication),
            subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
            title,
            type: MobileHomeItemType.ALBUM,
        };
    });

    return {
        id: MobileHomeSectionId.RECENTLY_ADDED,
        items: await annotateSubsonicHiResCollections(
            authentication,
            fetcher,
            'album',
            items,
            qualityScanLimit,
        ),
        title: 'Recently Added',
    };
};

const loadSubsonicFavoriteAlbumsAndArtists = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    limit: number,
    qualityScanLimit: number,
): Promise<MobileHomeSection[]> => {
    const body = await requestJson<SubsonicStarred2Body>(
        fetcher,
        subsonicUrl(authentication, 'getStarred2.view'),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load favorites');
    const source = getMobileContentSource(authentication);
    const favoriteAlbums: MobileHomeItem[] = await annotateSubsonicHiResCollections(
        authentication,
        fetcher,
        'album',
        (response?.starred2?.album ?? []).slice(0, limit).flatMap((album) => {
            const id = album.id?.toString();
            const title = album.name ?? album.title;

            if (!id || !title) {
                return [];
            }

            return {
                artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt, album.id),
                id,
                source,
                subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
                title,
                type: MobileHomeItemType.ALBUM,
            };
        }),
        qualityScanLimit,
    );
    const favoriteArtists: MobileHomeItem[] = (response?.starred2?.artist ?? [])
        .slice(0, limit)
        .flatMap((artist) => {
            const id = artist.id?.toString();

            if (!id || !artist.name) {
                return [];
            }

            return {
                artworkUrl: subsonicCoverArtUrl(authentication, artist.coverArt, artist.id),
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

    const items: MobileHomeItem[] = (response?.playlists?.playlist ?? []).flatMap((playlist) => {
        const id = playlist.id?.toString();

        if (!id || !playlist.name) {
            return [];
        }

        return {
            artworkUrl: subsonicCoverArtUrl(authentication, playlist.coverArt, playlist.id),
            id,
            source: getMobileContentSource(authentication),
            subtitle: playlist.songCount ? `${playlist.songCount} songs` : playlist.owner,
            title: playlist.name,
            type: MobileHomeItemType.PLAYLIST,
        };
    });

    // Playlists are mixed format by design — never run the hi-res scan or
    // stamp a collection-level badge on them. Per-track quality still shows
    // up on each row inside the playlist detail.
    return {
        id: MobileHomeSectionId.PLAYLISTS,
        items,
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
    qualityScanLimit: number,
): Promise<MobileHomeContent> => {
    const [favoritesResult, ...sectionLoads] = await Promise.allSettled([
        loadSubsonicFavoriteAlbumsAndArtists(
            authentication,
            fetcher,
            limit,
            qualityScanLimit,
        ),
        loadSubsonicAlbums(authentication, fetcher, limit, qualityScanLimit),
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

// ---------------------------------------------------------------------------
// Samo Server native
// ---------------------------------------------------------------------------

const formatSamoArtists = (
    artists: Array<{ name?: string }> | undefined,
): string | undefined => {
    if (!artists || artists.length === 0) return undefined;
    const names = artists.flatMap((artist) => (artist.name ? [artist.name] : []));
    return names.length > 0 ? names.join(', ') : undefined;
};

const formatSamoContributors = (
    contributors: Array<{ name?: string; role?: string }> | undefined,
): string | undefined => {
    if (!contributors || contributors.length === 0) return undefined;
    const authors = contributors
        .filter((person) => !person.role || person.role.toLowerCase() === 'author')
        .map((person) => person.name)
        .filter(Boolean) as string[];
    if (authors.length > 0) return authors.join(', ');
    const names = contributors.map((person) => person.name).filter(Boolean) as string[];
    return names.length > 0 ? names.join(', ') : undefined;
};

const toEpochMs = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const samoCompletionState = (
    playback: { completed?: boolean; progressSeconds?: number } | undefined,
): MobileHomeItem['completionState'] => {
    if (!playback) return undefined;
    if (playback.completed) return 'completed';
    if ((playback.progressSeconds ?? 0) > 0) return 'in-progress';
    return 'unplayed';
};

const samoQualityProfile = (
    audioFile: { bitDepth?: number; sampleRate?: number } | undefined,
): MobileQualityProfile | undefined => {
    if (!audioFile) return undefined;
    const { bitDepth, sampleRate } = audioFile;
    if (typeof bitDepth !== 'number' || typeof sampleRate !== 'number') return undefined;
    if (bitDepth <= 0 || sampleRate <= 0) return undefined;
    return { bitDepth, sampleRate };
};

const samoArtistRefsFromParallelArrays = (
    ids: string[] | undefined,
    names: string[] | undefined,
): Array<{ id?: string; name?: string }> | undefined => {
    if (!ids && !names) return undefined;
    const length = Math.max(ids?.length ?? 0, names?.length ?? 0);
    if (length === 0) return undefined;
    const refs: Array<{ id?: string; name?: string }> = [];
    for (let i = 0; i < length; i += 1) {
        refs.push({ id: ids?.[i], name: names?.[i] });
    }
    return refs;
};

const resolveSamoStreamToken = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<string | undefined> => {
    const cached = getCachedSamoStreamToken(authentication);
    if (cached) {
        return cached;
    }

    return ensureSamoStreamToken(authentication, fetcher).catch(() => undefined);
};

const samoAlbumToHomeItem = (
    authentication: ServerAuthenticationResult,
    album: SamoMusicAlbum,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!album.id || !album.title) return null;
    const subtitle =
        album.displayArtist
        ?? formatSamoArtists(samoArtistRefsFromParallelArrays(album.albumArtistIds, album.albumArtistNames))
        ?? (album.releaseYear ? String(album.releaseYear) : undefined);

    return {
        addedAt: toEpochMs(album.addedAt),
        artworkImageId: pickSamoImageId(album.images),
        artworkUrl: resolveSamoAlbumArtworkUrl(authentication, album, streamToken),
        id: album.id,
        qualityProfile: samoQualityProfile(album.primaryAudioFile),
        source,
        subtitle,
        title: album.title,
        type: MobileHomeItemType.ALBUM,
    };
};

const samoArtistToHomeItem = (
    authentication: ServerAuthenticationResult,
    artist: SamoMusicArtist,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!artist.id || !artist.name) return null;

    return {
        addedAt: toEpochMs(artist.addedAt),
        artworkImageId: pickSamoImageId(artist.images),
        artworkUrl: resolveSamoArtistArtworkUrl(authentication, artist, streamToken),
        id: artist.id,
        source,
        subtitle: artist.albumCount ? `${artist.albumCount} albums` : undefined,
        title: artist.name,
        type: MobileHomeItemType.ARTIST,
    };
};

const samoPlaylistToHomeItem = (
    authentication: ServerAuthenticationResult,
    playlist: SamoMusicPlaylist,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!playlist.id || !playlist.name) return null;

    return {
        artworkImageId: pickSamoImageId(playlist.images),
        artworkUrl: resolveSamoPlaylistArtworkUrl(authentication, playlist, streamToken),
        id: playlist.id,
        source,
        subtitle: playlist.trackCount
            ? `${playlist.trackCount} tracks`
            : playlist.ownerName ?? undefined,
        title: playlist.name,
        type: MobileHomeItemType.PLAYLIST,
    };
};

const samoTrackToHomeItem = (
    authentication: ServerAuthenticationResult,
    track: SamoMusicTrack,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!track.id || !track.title || !track.albumId) return null;

    const subtitle =
        formatSamoArtists(
            samoArtistRefsFromParallelArrays(track.albumArtistIds, track.albumArtistNames),
        ) ?? (track.releaseYear ? String(track.releaseYear) : undefined);

    return {
        addedAt: toEpochMs(track.addedAt),
        artworkImageId: pickSamoImageId(track.images),
        artworkUrl: resolveSamoTrackArtworkUrl(authentication, track, streamToken),
        durationSeconds: track.durationSeconds,
        id: track.albumId,
        qualityProfile: samoQualityProfile(track.primaryAudioFile ?? track.audioFiles?.[0]),
        source,
        subtitle,
        title: track.albumTitle ?? track.title,
        type: MobileHomeItemType.ALBUM, // tracks tile as album-style in the recently-added row
    };
};

/**
 * Track artwork comes straight from the track's metadata `images[]`.
 */
const resolveSamoTrackArtworkUrl = (
    authentication: ServerAuthenticationResult,
    track: Pick<SamoMusicTrack, 'images'>,
    streamToken: string | undefined,
): string | undefined => {
    return resolveSamoAlbumArtworkUrl(authentication, { images: track.images }, streamToken);
};

const samoAudiobookToHomeItem = (
    authentication: ServerAuthenticationResult,
    audiobook: SamoAudiobook,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!audiobook.id) return null;
    const title = audiobook.book?.title;
    if (!title) return null;

    const authors = formatSamoContributors(audiobook.book?.authors)
        ?? formatSamoContributors(audiobook.contributors);
    const series = audiobook.series && audiobook.series.length > 0
        ? audiobook.series
              .map((entry) =>
                  audiobook.book?.seriesSequence
                      ? `${entry.name} #${audiobook.book.seriesSequence}`
                      : entry.name,
              )
              .filter(Boolean)
              .join(', ')
        : undefined;

    return {
        addedAt: toEpochMs(audiobook.addedAt),
        artworkUrl: resolveSamoAudiobookArtworkUrl(authentication, audiobook, streamToken),
        completionState: samoCompletionState(audiobook.progress),
        contributorsSummary: authors,
        durationSeconds: audiobook.durationSeconds,
        id: audiobook.id,
        progressSeconds: audiobook.progress?.progressSeconds,
        seriesSummary: series,
        source,
        subtitle: authors ?? series,
        title,
        type: MobileHomeItemType.AUDIOBOOK,
    };
};

const samoPodcastToHomeItem = (
    authentication: ServerAuthenticationResult,
    podcast: SamoPodcast,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!podcast.id) return null;
    const inner = podcast.podcast;
    const title = inner?.title;
    if (!title) return null;

    return {
        addedAt: toEpochMs(podcast.addedAt),
        artworkUrl: resolveSamoPodcastArtworkUrl(authentication, podcast, streamToken),
        contributorsSummary: inner?.author,
        id: podcast.id,
        source,
        subtitle: inner?.episodeCount ? `${inner.episodeCount} episodes` : inner?.author,
        title,
        type: MobileHomeItemType.PODCAST,
    };
};

const samoInternetRadioToHomeItem = (
    authentication: ServerAuthenticationResult,
    station: SamoInternetRadioStation,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    const streamUrl = station.publicStreamUrl ?? station.streamUrl;

    if (!station.id || !station.name || !streamUrl) return null;
    const artworkUrl = resolveSamoStationArtworkUrl(authentication, station, streamToken);
    const playback = buildSamoInternetRadioPlayback(authentication, station, artworkUrl);
    const nowPlayingText =
        station.nowPlaying?.title ||
        [station.nowPlaying?.artist, station.nowPlaying?.raw]
            .filter(Boolean)
            .join(' — ') ||
        undefined;

    return {
        artworkImageId: pickSamoCatalogImageId(station.coverId),
        artworkUrl,
        id: station.id,
        nowPlayingText,
        playback: playback ?? undefined,
        source,
        subtitle: nowPlayingText ?? station.homepageUrl ?? streamUrl,
        title: station.name,
        type: MobileHomeItemType.RADIO,
    };
};

const samoProgrammedRadioToHomeItem = (
    authentication: ServerAuthenticationResult,
    station: SamoProgrammedRadioStation,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!station.id || !station.name || !station.streamUrl) return null;
    const artworkUrl = resolveSamoAlbumArtworkUrl(
        authentication,
        { images: station.images },
        streamToken,
    );
    const artworkImageId = pickSamoImageId(station.images);
    const nowPlayingText = station.nowPlaying?.title;
    return {
        artworkImageId,
        artworkUrl,
        id: station.id,
        nowPlayingText,
        playback: {
            artworkImageId,
            artworkUrl,
            contentSourceId: getMobileContentSource(authentication).id,
            id: `samo:radio-programmed:${station.id}`,
            isLive: true,
            quality: {
                container: null,
                deliveryKind: 'android-direct',
                losslessRequired: false,
                serverTranscodeRequested: false,
            },
            source: 'radio',
            title: station.name,
            url: station.streamUrl,
        },
        source,
        subtitle: nowPlayingText ?? station.description,
        title: station.name,
        type: MobileHomeItemType.RADIO,
    };
};

const settledOrEmpty = <T>(result: PromiseSettledResult<T[]>): T[] =>
    result.status === 'fulfilled' ? result.value : [];

const mergeSamoHomeItems = (...lists: MobileHomeItem[][]): MobileHomeItem[] => {
    const seen = new Set<string>();
    const seenAlbumTitles = new Set<string>();
    const merged: MobileHomeItem[] = [];

    for (const list of lists) {
        for (const item of list) {
            const key = `${item.source?.id ?? ''}:${item.id}:${item.type}`;
            if (seen.has(key)) {
                continue;
            }
            if (item.type === MobileHomeItemType.ALBUM) {
                const albumKey = `${item.source?.id ?? ''}:album:${item.title.trim().toLowerCase()}`;
                if (seenAlbumTitles.has(albumKey)) {
                    continue;
                }
                seenAlbumTitles.add(albumKey);
            }
            seen.add(key);
            merged.push(item);
        }
    }

    return merged;
};

const sortHomeItemsByAddedAt = (items: MobileHomeItem[]): MobileHomeItem[] => {
    return [...items].sort((left, right) => {
        const leftAdded = left.addedAt ?? -Infinity;
        const rightAdded = right.addedAt ?? -Infinity;
        if (leftAdded !== rightAdded) {
            return rightAdded - leftAdded;
        }
        return left.title.localeCompare(right.title);
    });
};

const loadSamoHomeContent = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    limit: number,
): Promise<MobileHomeContent> => {
    const source = getMobileContentSource(authentication);
    const streamToken = await resolveSamoStreamToken(authentication, fetcher);
    const recentListQuery = { direction: 'desc' as const, limit, sort: 'recent' as const };

    const [
        recentAlbumsResult,
        recentArtistsResult,
        recentTracksResult,
        favoritesAlbumsResult,
        favoritesArtistsResult,
        playlistsResult,
        audiobooksResult,
        podcastsResult,
        internetRadioResult,
        programmedRadioResult,
    ] = await Promise.allSettled([
        listSamoMusicAlbums(fetcher, authentication, recentListQuery).then((body) =>
            samoItemsOf(body).flatMap((album) => {
                const item = samoAlbumToHomeItem(authentication, album, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        listSamoMusicArtists(fetcher, authentication, recentListQuery).then((body) =>
            samoItemsOf(body).flatMap((artist) => {
                const item = samoArtistToHomeItem(authentication, artist, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        listSamoMusicTracks(fetcher, authentication, recentListQuery).then((body) =>
            samoItemsOf(body).flatMap((track) => {
                const item = samoTrackToHomeItem(authentication, track, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'favorites', { limit }).then((body) => {
            const albums = samoItemsOf(body.albums as SamoPaginatedResponse<SamoMusicAlbum>);
            return albums.flatMap((album) => {
                const item = samoAlbumToHomeItem(authentication, album, streamToken, source);
                return item ? [item] : [];
            });
        }),
        getSamoMusicBrowse(fetcher, authentication, 'favorites', { limit }).then((body) => {
            const artists = samoItemsOf(body.artists as SamoPaginatedResponse<SamoMusicArtist>);
            return artists.flatMap((artist) => {
                const item = samoArtistToHomeItem(authentication, artist, streamToken, source);
                return item ? [item] : [];
            });
        }),
        listSamoMusicPlaylists(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((playlist) => {
                const item = samoPlaylistToHomeItem(authentication, playlist, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        listSamoAudiobooks(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((audiobook) => {
                const item = samoAudiobookToHomeItem(authentication, audiobook, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        listSamoPodcasts(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((podcast) => {
                const item = samoPodcastToHomeItem(authentication, podcast, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        listSamoInternetRadioStations(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((station) => {
                const item = samoInternetRadioToHomeItem(
                    authentication,
                    station,
                    streamToken,
                    source,
                );
                return item ? [item] : [];
            }),
        ),
        listSamoProgrammedRadioStations(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((station) => {
                const item = samoProgrammedRadioToHomeItem(
                    authentication,
                    station,
                    streamToken,
                    source,
                );
                return item ? [item] : [];
            }),
        ),
    ]);

    const recentlyAdded = {
        albums: settledOrEmpty(recentAlbumsResult),
        artists: settledOrEmpty(recentArtistsResult),
        tracks: settledOrEmpty(recentTracksResult),
    };
    const errors: MobileHomeSectionError[] = [];
    const pushError = (
        result: PromiseSettledResult<unknown>,
        sectionId: MobileHomeSectionId,
    ) => {
        if (result.status === 'rejected') {
            errors.push({
                message: getErrorMessage(result.reason),
                sectionId,
            });
        }
    };
    pushError(recentAlbumsResult, MobileHomeSectionId.RECENTLY_ADDED);
    pushError(recentArtistsResult, MobileHomeSectionId.RECENTLY_ADDED);
    pushError(recentTracksResult, MobileHomeSectionId.RECENTLY_ADDED);
    pushError(favoritesAlbumsResult, MobileHomeSectionId.FAVORITE_ALBUMS);
    pushError(favoritesArtistsResult, MobileHomeSectionId.FAVORITE_ARTISTS);
    pushError(playlistsResult, MobileHomeSectionId.PLAYLISTS);
    pushError(audiobooksResult, MobileHomeSectionId.AUDIOBOOKS);
    pushError(podcastsResult, MobileHomeSectionId.PODCASTS);
    pushError(internetRadioResult, MobileHomeSectionId.RADIO);
    pushError(programmedRadioResult, MobileHomeSectionId.RADIO);

    const radioItems = [
        ...settledOrEmpty(programmedRadioResult),
        ...settledOrEmpty(internetRadioResult),
    ];

    const sections: MobileHomeSection[] = [
        {
            id: MobileHomeSectionId.RECENTLY_ADDED,
            items: sortHomeItemsByAddedAt(
                mergeSamoHomeItems(
                    recentlyAdded.albums,
                    recentlyAdded.tracks,
                    recentlyAdded.artists,
                ),
            ).slice(0, limit),
            title: 'Recently Added',
        },
        {
            id: MobileHomeSectionId.FAVORITE_ALBUMS,
            items: settledOrEmpty(favoritesAlbumsResult),
            title: 'Favorite Albums',
        },
        {
            id: MobileHomeSectionId.FAVORITE_ARTISTS,
            items: mergeSamoHomeItems(
                settledOrEmpty(favoritesArtistsResult),
                settledOrEmpty(recentArtistsResult),
            ).slice(0, limit),
            title: 'Favorite Artists',
        },
        {
            id: MobileHomeSectionId.AUDIOBOOKS,
            items: settledOrEmpty(audiobooksResult),
            title: 'Audiobooks',
        },
        {
            id: MobileHomeSectionId.PODCASTS,
            items: settledOrEmpty(podcastsResult),
            title: 'Podcasts',
        },
        {
            id: MobileHomeSectionId.PLAYLISTS,
            items: settledOrEmpty(playlistsResult),
            title: 'Playlists',
        },
        {
            id: MobileHomeSectionId.RADIO,
            items: radioItems,
            title: 'Radio',
        },
    ].filter(hasItems);

    return {
        errors,
        loadedAt: Date.now(),
        sections,
        serverTitle: authentication.title,
    };
};

const SAMO_FULL_COLLECTION_LIMIT = 500;
const SAMO_FULL_COLLECTION_MAX_PAGES = 40;

const loadSamoFullCollectionPaged = async <T>(
    page: (input: { limit: number; offset: number }) => Promise<SamoPaginatedResponse<T> | T[]>,
): Promise<T[]> => {
    const all: T[] = [];

    for (let i = 0; i < SAMO_FULL_COLLECTION_MAX_PAGES; i += 1) {
        const response = await page({
            limit: SAMO_FULL_COLLECTION_LIMIT,
            offset: i * SAMO_FULL_COLLECTION_LIMIT,
        });
        const batch = samoItemsOf<T>(response);
        if (batch.length === 0) break;
        all.push(...batch);
        if (batch.length < SAMO_FULL_COLLECTION_LIMIT) break;
    }

    return all;
};

const loadSamoFullCollection = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    variant: MobileFullCollectionVariant,
): Promise<MobileHomeItem[]> => {
    const source = getMobileContentSource(authentication);
    const streamToken = await resolveSamoStreamToken(authentication, fetcher);

    switch (variant) {
        case 'album': {
            const albums = await loadSamoFullCollectionPaged<SamoMusicAlbum>((input) =>
                listSamoMusicAlbums(fetcher, authentication, input),
            );
            return albums.flatMap((album) => {
                const item = samoAlbumToHomeItem(authentication, album, streamToken, source);
                return item ? [item] : [];
            });
        }
        case 'artist': {
            const artists = await loadSamoFullCollectionPaged<SamoMusicArtist>((input) =>
                listSamoMusicArtists(fetcher, authentication, input),
            );
            return artists.flatMap((artist) => {
                const item = samoArtistToHomeItem(authentication, artist, streamToken, source);
                return item ? [item] : [];
            });
        }
        case 'audiobook': {
            const audiobooks = await loadSamoFullCollectionPaged<SamoAudiobook>((input) =>
                listSamoAudiobooks(fetcher, authentication, input),
            );
            return audiobooks.flatMap((audiobook) => {
                const item = samoAudiobookToHomeItem(authentication, audiobook, streamToken, source);
                return item ? [item] : [];
            });
        }
        case 'playlist': {
            const playlists = await loadSamoFullCollectionPaged<SamoMusicPlaylist>((input) =>
                listSamoMusicPlaylists(fetcher, authentication, input),
            );
            return playlists.flatMap((playlist) => {
                const item = samoPlaylistToHomeItem(authentication, playlist, streamToken, source);
                return item ? [item] : [];
            });
        }
        case 'podcast': {
            const podcasts = await loadSamoFullCollectionPaged<SamoPodcast>((input) =>
                listSamoPodcasts(fetcher, authentication, input),
            );
            return podcasts.flatMap((podcast) => {
                const item = samoPodcastToHomeItem(authentication, podcast, streamToken, source);
                return item ? [item] : [];
            });
        }
    }
};

const loadSamoLibraryRelevantItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeItem[]> => {
    const source = getMobileContentSource(authentication);
    const streamToken = await resolveSamoStreamToken(authentication, fetcher);

    const buckets = await Promise.allSettled([
        getSamoMusicBrowse(fetcher, authentication, 'recently-added', { limit: 80 }).then((body) =>
            samoItemsOf(body.albums as SamoPaginatedResponse<SamoMusicAlbum>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'recently-added', { limit: 80 }).then((body) =>
            samoItemsOf(body.artists as SamoPaginatedResponse<SamoMusicArtist>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'recently-played', { limit: 80 }).then((body) =>
            samoItemsOf(body.albums as SamoPaginatedResponse<SamoMusicAlbum>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'recently-played', { limit: 80 }).then((body) =>
            samoItemsOf(body.artists as SamoPaginatedResponse<SamoMusicArtist>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'favorites', { limit: 80 }).then((body) =>
            samoItemsOf(body.albums as SamoPaginatedResponse<SamoMusicAlbum>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'favorites', { limit: 80 }).then((body) =>
            samoItemsOf(body.artists as SamoPaginatedResponse<SamoMusicArtist>),
        ),
        listSamoMusicArtists(fetcher, authentication, {
            direction: 'desc',
            limit: 80,
            sort: 'recent',
        }).then((body) => samoItemsOf(body)),
        listSamoMusicPlaylists(fetcher, authentication, { limit: 80 }).then((body) =>
            samoItemsOf(body),
        ),
        listSamoAudiobooks(fetcher, authentication, { limit: 80 }).then((body) =>
            samoItemsOf(body),
        ),
        listSamoPodcasts(fetcher, authentication, { limit: 80 }).then((body) =>
            samoItemsOf(body),
        ),
        listSamoInternetRadioStations(fetcher, authentication, { limit: 40 }).then((body) =>
            samoItemsOf(body),
        ),
    ]);

    const seen = new Set<string>();
    const items: MobileHomeItem[] = [];

    const push = (item: MobileHomeItem | null) => {
        if (!item) return;
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push(item);
    };

    if (buckets[0].status === 'fulfilled') {
        for (const album of buckets[0].value as SamoMusicAlbum[]) {
            push(samoAlbumToHomeItem(authentication, album, streamToken, source));
        }
    }
    if (buckets[1].status === 'fulfilled') {
        for (const artist of buckets[1].value as SamoMusicArtist[]) {
            push(samoArtistToHomeItem(authentication, artist, streamToken, source));
        }
    }
    if (buckets[2].status === 'fulfilled') {
        for (const album of buckets[2].value as SamoMusicAlbum[]) {
            push(samoAlbumToHomeItem(authentication, album, streamToken, source));
        }
    }
    if (buckets[3].status === 'fulfilled') {
        for (const artist of buckets[3].value as SamoMusicArtist[]) {
            push(samoArtistToHomeItem(authentication, artist, streamToken, source));
        }
    }
    if (buckets[4].status === 'fulfilled') {
        for (const album of buckets[4].value as SamoMusicAlbum[]) {
            push(samoAlbumToHomeItem(authentication, album, streamToken, source));
        }
    }
    if (buckets[5].status === 'fulfilled') {
        for (const artist of buckets[5].value as SamoMusicArtist[]) {
            push(samoArtistToHomeItem(authentication, artist, streamToken, source));
        }
    }
    if (buckets[6].status === 'fulfilled') {
        for (const artist of buckets[6].value as SamoMusicArtist[]) {
            push(samoArtistToHomeItem(authentication, artist, streamToken, source));
        }
    }
    if (buckets[7].status === 'fulfilled') {
        for (const playlist of buckets[7].value as SamoMusicPlaylist[]) {
            push(samoPlaylistToHomeItem(authentication, playlist, streamToken, source));
        }
    }
    if (buckets[8].status === 'fulfilled') {
        for (const audiobook of buckets[8].value as SamoAudiobook[]) {
            push(samoAudiobookToHomeItem(authentication, audiobook, streamToken, source));
        }
    }
    if (buckets[9].status === 'fulfilled') {
        for (const podcast of buckets[9].value as SamoPodcast[]) {
            push(samoPodcastToHomeItem(authentication, podcast, streamToken, source));
        }
    }
    if (buckets[10].status === 'fulfilled') {
        for (const station of buckets[10].value as SamoInternetRadioStation[]) {
            push(samoInternetRadioToHomeItem(authentication, station, streamToken, source));
        }
    }

    return items.slice(0, LIBRARY_RELEVANT_MAX_ITEMS);
};

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export const loadMobileHomeContent = async ({
    authentication,
    fetch: fetcher,
    limit = DEFAULT_HOME_LIMIT,
    qualityScanLimit = limit,
}: MobileHomeContentInput): Promise<MobileHomeContent> => {
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        return loadAudiobookshelfHomeContent(authentication, request, limit);
    }

    if (
        authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC
    ) {
        return loadSubsonicHomeContent(authentication, request, limit, qualityScanLimit);
    }

    if (authentication.type === ServerType.SAMO) {
        return loadSamoHomeContent(authentication, request, limit);
    }

    throw new Error('Home content is not wired for this server type');
};

const getHomeFailureSectionId = (authentication: ServerAuthenticationResult) => {
    return authentication.type === ServerType.AUDIOBOOKSHELF
        ? MobileHomeSectionId.AUDIOBOOKS
        : MobileHomeSectionId.RECENTLY_ADDED;
};

export type MobileFullCollectionVariant =
    | 'album'
    | 'artist'
    | 'audiobook'
    | 'playlist'
    | 'podcast';

export interface MobileFullCollectionInput {
    authentications: ServerAuthenticationResult[];
    fetch?: SamoFetch;
    qualityScanLimit?: number;
    variant: MobileFullCollectionVariant;
}

export interface MobileFullCollectionResult {
    errors: string[];
    items: MobileHomeItem[];
}

interface SubsonicArtistsBody {
    'subsonic-response'?: {
        artists?: {
            index?: Array<{
                artist?: SubsonicArtist[];
                name?: string;
            }>;
        };
        error?: SubsonicError;
        status?: string;
    };
}

// Subsonic pagination is offset-based; libraries beyond ~5k albums need
// multiple round-trips. 500 hits the sweet spot where Navidrome still returns
// fast (~100ms) but we don't waste a dozen requests for the typical user.
const FULL_COLLECTION_PAGE_SIZE = 500;
// Cap iterations as a safety so a misbehaving server can't loop forever.
const FULL_COLLECTION_MAX_PAGES = 40;

const loadAllSubsonicAlbums = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeItem[]> => {
    const source = getMobileContentSource(authentication);
    const items: MobileHomeItem[] = [];

    for (let page = 0; page < FULL_COLLECTION_MAX_PAGES; page += 1) {
        const body = await requestJson<SubsonicAlbumListBody>(
            fetcher,
            subsonicUrl(authentication, 'getAlbumList2.view', {
                offset: page * FULL_COLLECTION_PAGE_SIZE,
                size: FULL_COLLECTION_PAGE_SIZE,
                type: 'alphabeticalByName',
            }),
        );
        const response = body['subsonic-response'];
        assertSubsonicOk(response, 'Failed to load albums');
        const albums = response?.albumList2?.album ?? [];
        if (albums.length === 0) {
            break;
        }
        for (const album of albums) {
            const id = album.id?.toString();
            const title = album.name ?? album.title;
            if (!id || !title) continue;
            const createdMs = album.created ? Date.parse(album.created) : NaN;
            items.push({
                addedAt: Number.isFinite(createdMs) ? createdMs : undefined,
                artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt, album.id),
                id,
                source,
                subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
                title,
                type: MobileHomeItemType.ALBUM,
            });
        }
        if (albums.length < FULL_COLLECTION_PAGE_SIZE) {
            break;
        }
    }

    return items;
};

const loadAllSubsonicArtists = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeItem[]> => {
    // getArtists.view returns ALL artists in one shot, grouped by alphabet
    // index — no pagination needed. This matches how Navidrome exposes the
    // artist library to other clients and avoids the inconsistent paging
    // semantics on getArtistList variants.
    const body = await requestJson<SubsonicArtistsBody>(
        fetcher,
        subsonicUrl(authentication, 'getArtists.view'),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load artists');
    const source = getMobileContentSource(authentication);
    const items: MobileHomeItem[] = [];
    for (const index of response?.artists?.index ?? []) {
        for (const artist of index.artist ?? []) {
            const id = artist.id?.toString();
            if (!id || !artist.name) continue;
            items.push({
                artworkUrl: subsonicCoverArtUrl(authentication, artist.coverArt, artist.id),
                id,
                source,
                subtitle: artist.albumCount ? `${artist.albumCount} albums` : undefined,
                title: artist.name,
                type: MobileHomeItemType.ARTIST,
            });
        }
    }
    return items;
};

const loadAllSubsonicPlaylists = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeItem[]> => {
    // getPlaylists.view already returns the complete list — we can reuse the
    // home-page loader unchanged, just without the home-page item cap.
    const section = await loadSubsonicPlaylists(authentication, fetcher);
    return section.items;
};

const loadAllAudiobookshelfItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    itemType: MobileHomeItemType.AUDIOBOOK | MobileHomeItemType.PODCAST,
): Promise<MobileHomeItem[]> => {
    const librariesBody = await requestJson<AudiobookshelfLibrariesBody>(
        fetcher,
        `${authentication.url}/api/libraries`,
        {
            headers: { Authorization: `Bearer ${authentication.credential}` },
            method: 'GET',
        },
    );
    const libraries = (librariesBody.libraries ?? []).filter(
        (library) => library.mediaType === (itemType === MobileHomeItemType.PODCAST ? 'podcast' : 'book'),
    );
    const perLibrary = await Promise.all(
        libraries.map((library) =>
            loadAudiobookshelfItems(
                authentication,
                fetcher,
                library,
                itemType,
                FULL_COLLECTION_PAGE_SIZE * FULL_COLLECTION_MAX_PAGES,
            ),
        ),
    );
    return perLibrary.flat();
};

/**
 * Cap on the per-album quality scan when exploding the full library —
 * scanning every album in a 10k-track collection would be a per-album HTTP
 * fan-out we don't want to pay for at View-All open time. 200 covers the
 * top of the alphabetical sweep that the user is most likely to scroll
 * through; the rest pass through unbadged until the user opens them.
 */
const FULL_COLLECTION_QUALITY_SCAN_LIMIT = 200;

const loadFullCollectionForServer = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    variant: MobileFullCollectionVariant,
    qualityScanLimit: number,
): Promise<MobileHomeItem[]> => {
    const subsonic =
        authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC;
    const audiobookshelf = authentication.type === ServerType.AUDIOBOOKSHELF;
    const samo = authentication.type === ServerType.SAMO;

    if (samo) {
        return loadSamoFullCollection(authentication, fetcher, variant);
    }

    switch (variant) {
        case 'album': {
            if (!subsonic) return [];
            const albums = await loadAllSubsonicAlbums(authentication, fetcher);
            // Annotate the first chunk so the View All grid renders badges
            // alongside the badge-bearing tiles the user sees on Home. The
            // tail of huge libraries stays unbadged at this surface — opening
            // any individual album still shows the correct format.
            return annotateSubsonicAlbumsQuality(
                authentication,
                fetcher,
                albums,
                qualityScanLimit,
            );
        }
        case 'artist':
            return subsonic ? loadAllSubsonicArtists(authentication, fetcher) : [];
        case 'audiobook':
            return audiobookshelf
                ? loadAllAudiobookshelfItems(authentication, fetcher, MobileHomeItemType.AUDIOBOOK)
                : [];
        case 'playlist':
            return subsonic ? loadAllSubsonicPlaylists(authentication, fetcher) : [];
        case 'podcast':
            return audiobookshelf
                ? loadAllAudiobookshelfItems(authentication, fetcher, MobileHomeItemType.PODCAST)
                : [];
    }
};

/**
 * Load the COMPLETE list of items for a given collection variant across every
 * connected server. Used by the "View All" screens — Home only fetches the top
 * slice of each section, but the View All grids are supposed to be exhaustive.
 *
 * Failures from individual servers are bubbled up as errors but never block
 * the items returned by other servers — partial connectivity should still
 * show whatever it can.
 */
export const loadMobileFullCollection = async ({
    authentications,
    fetch: fetcher,
    qualityScanLimit = FULL_COLLECTION_QUALITY_SCAN_LIMIT,
    variant,
}: MobileFullCollectionInput): Promise<MobileFullCollectionResult> => {
    if (authentications.length === 0) {
        return { errors: [], items: [] };
    }
    const request = getFetch(fetcher);
    const results = await Promise.allSettled(
        authentications.map((authentication) =>
            loadFullCollectionForServer(authentication, request, variant, qualityScanLimit),
        ),
    );
    const items: MobileHomeItem[] = [];
    const errors: string[] = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            items.push(...result.value);
        } else {
            errors.push(`${authentications[index].title}: ${getErrorMessage(result.reason)}`);
        }
    });
    return { errors, items };
};

export const loadMobileHomeContentForServers = async ({
    authentications,
    fetch: fetcher,
    limit = DEFAULT_HOME_LIMIT,
    qualityScanLimit = limit,
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
            loadMobileHomeContent({
                authentication,
                fetch: request,
                limit,
                qualityScanLimit,
            }),
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

/** Target size for the Library "Relevant" catalog — fast to load, feels personal. */
export const LIBRARY_RELEVANT_MAX_ITEMS = 300;
const LIBRARY_RELEVANT_ALBUM_LIST_SIZE = 50;
const LIBRARY_RELEVANT_ABS_LIMIT = 80;
const LIBRARY_RELEVANT_QUALITY_SCAN_LIMIT = 0;

export interface MobileLibraryRelevantContent {
    errors: string[];
    items: MobileHomeItem[];
    loadedAt: number;
}

export interface MobileLibraryRelevantContentForServersInput {
    authentications: ServerAuthenticationResult[];
    fetch?: SamoFetch;
    maxItems?: number;
}

const mergeLibraryRelevantItems = (
    batches: MobileHomeItem[][],
    maxItems: number,
): MobileHomeItem[] => {
    const itemsByKey = new Map<string, MobileHomeItem>();

    for (const batch of batches) {
        for (const item of batch) {
            const key = `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;
            if (!itemsByKey.has(key)) {
                itemsByKey.set(key, item);
            }
        }
        if (itemsByKey.size >= maxItems) {
            break;
        }
    }

    return [...itemsByKey.values()].slice(0, maxItems);
};

const loadSubsonicAlbumListItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    type: string,
    size: number,
): Promise<MobileHomeItem[]> => {
    const body = await requestJson<SubsonicAlbumListBody>(
        fetcher,
        subsonicUrl(authentication, 'getAlbumList2.view', {
            size,
            type,
        }),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, `Failed to load ${type} albums`);

    const source = getMobileContentSource(authentication);

    return (response?.albumList2?.album ?? []).flatMap((album) => {
        const id = album.id?.toString();
        const title = album.name ?? album.title;

        if (!id || !title) {
            return [];
        }

        const createdMs = album.created ? Date.parse(album.created) : NaN;

        return {
            addedAt: Number.isFinite(createdMs) ? createdMs : undefined,
            artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt, album.id),
            id,
            source,
            subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
            title,
            type: MobileHomeItemType.ALBUM,
        };
    });
};

const loadSubsonicLibraryRelevantItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeItem[]> => {
    const listSize = LIBRARY_RELEVANT_ALBUM_LIST_SIZE;
    const [
        recentAlbumsResult,
        frequentAlbumsResult,
        newestAlbumsResult,
        favoritesResult,
        playlistsResult,
        radioResult,
    ] = await Promise.allSettled([
        loadSubsonicAlbumListItems(authentication, fetcher, 'recent', listSize),
        loadSubsonicAlbumListItems(authentication, fetcher, 'frequent', listSize),
        loadSubsonicAlbumListItems(authentication, fetcher, 'newest', listSize),
        loadSubsonicFavoriteAlbumsAndArtists(
            authentication,
            fetcher,
            listSize,
            LIBRARY_RELEVANT_QUALITY_SCAN_LIMIT,
        ),
        loadSubsonicPlaylists(authentication, fetcher),
        loadSubsonicRadio(authentication, fetcher),
    ]);

    const batches: MobileHomeItem[][] = [];

    if (recentAlbumsResult.status === 'fulfilled') {
        batches.push(recentAlbumsResult.value);
    }
    if (frequentAlbumsResult.status === 'fulfilled') {
        batches.push(frequentAlbumsResult.value);
    }
    if (newestAlbumsResult.status === 'fulfilled') {
        batches.push(newestAlbumsResult.value);
    }
    if (favoritesResult.status === 'fulfilled') {
        batches.push(favoritesResult.value.flatMap((section) => section.items));
    }
    if (playlistsResult.status === 'fulfilled') {
        batches.push(playlistsResult.value.items);
    }
    if (radioResult.status === 'fulfilled') {
        batches.push(radioResult.value.items);
    }

    return mergeLibraryRelevantItems(batches, LIBRARY_RELEVANT_MAX_ITEMS);
};

const loadAudiobookshelfLibraryRelevantItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeItem[]> => {
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
    const [audiobooksResult, podcastsResult] = await Promise.allSettled([
        Promise.all(
            bookLibraries.map((library) =>
                loadAudiobookshelfItems(
                    authentication,
                    fetcher,
                    library,
                    MobileHomeItemType.AUDIOBOOK,
                    LIBRARY_RELEVANT_ABS_LIMIT,
                ),
            ),
        ),
        Promise.all(
            podcastLibraries.map((library) =>
                loadAudiobookshelfItems(
                    authentication,
                    fetcher,
                    library,
                    MobileHomeItemType.PODCAST,
                    LIBRARY_RELEVANT_ABS_LIMIT,
                ),
            ),
        ),
    ]);

    const batches: MobileHomeItem[][] = [];

    if (audiobooksResult.status === 'fulfilled') {
        batches.push(audiobooksResult.value.flat());
    }
    if (podcastsResult.status === 'fulfilled') {
        batches.push(podcastsResult.value.flat());
    }

    return mergeLibraryRelevantItems(batches, LIBRARY_RELEVANT_MAX_ITEMS);
};

const loadMobileLibraryRelevantContent = async ({
    authentication,
    fetch: fetcher,
}: {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
}): Promise<MobileHomeItem[]> => {
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        return loadAudiobookshelfLibraryRelevantItems(authentication, request);
    }

    if (
        authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC
    ) {
        return loadSubsonicLibraryRelevantItems(authentication, request);
    }

    if (authentication.type === ServerType.SAMO) {
        return loadSamoLibraryRelevantItems(authentication, request);
    }

    return [];
};

/**
 * Build the Library "Relevant" catalog: server-side recency signals (recent /
 * frequent / newest albums, favorites, playlists, radio, ABS recents) merged
 * across every connected server, capped for a fast first paint.
 */
export const loadMobileLibraryRelevantContentForServers = async ({
    authentications,
    fetch: fetcher,
    maxItems = LIBRARY_RELEVANT_MAX_ITEMS,
}: MobileLibraryRelevantContentForServersInput): Promise<MobileLibraryRelevantContent> => {
    const loadedAt = Date.now();

    if (authentications.length === 0) {
        return { errors: [], items: [], loadedAt };
    }

    const results = await Promise.allSettled(
        authentications.map((authentication) =>
            loadMobileLibraryRelevantContent({ authentication, fetch: fetcher }),
        ),
    );
    const batches: MobileHomeItem[][] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            batches.push(result.value);
        } else {
            errors.push(`${authentications[index].title}: ${getErrorMessage(result.reason)}`);
        }
    });

    return {
        errors,
        items: mergeLibraryRelevantItems(batches, maxItems),
        loadedAt,
    };
};

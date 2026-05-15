import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';
import { ServerType } from '../server/server-types';
import { getMobileContentSource, type MobileContentSource } from './mobile-content-source';
import { type MobileHomeItem, MobileHomeItemType } from './mobile-home';
import {
    buildSubsonicMusicPlayback,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
    type SubsonicPlayableSong,
} from './mobile-playback';

export enum MobileMediaDetailType {
    ALBUM = 'album',
    ARTIST = 'artist',
    AUDIOBOOK = 'audiobook',
    PLAYLIST = 'playlist',
    PODCAST = 'podcast',
}

export interface AddMobileTracksToPlaylistInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    playlistId: string;
    songIds: string[];
}

export interface MobileMediaDetail {
    appearsOnItems?: MobileHomeItem[];
    artworkUrl?: string;
    biography?: string;
    id: string;
    items?: MobileHomeItem[];
    metadataLines?: string[];
    relatedArtists?: MobileHomeItem[];
    source: MobileContentSource;
    subtitle?: string;
    title: string;
    topTracks?: MobileMediaTrack[];
    tracks: MobileMediaTrack[];
    type: MobileMediaDetailType;
}

export interface MobileMediaDetailInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    id: string;
    type: MobileMediaDetailType;
}

export interface MobileMediaTrack {
    album?: string;
    albumId?: string;
    artist?: string;
    artistId?: string;
    artworkUrl?: string;
    durationSeconds?: number;
    episodeId?: string;
    id: string;
    itemId?: string;
    playback?: MobilePlayableAudio;
    publishedAt?: number;
    startSeconds?: number;
    subtitle?: string;
    timelineSegments?: MobilePlaybackSegment[];
    title: string;
    trackNumber?: number;
}

interface AudiobookshelfLibraryItem {
    id?: string;
    media?: {
        authorName?: string;
        authors?: Array<{ id?: string; name?: string }>;
        chapters?: Array<{ start: number; title?: string }>;
        duration?: number;
        episodes?: AudiobookshelfPodcastEpisode[];
        metadata?: {
            asin?: string;
            author?: string;
            authorName?: string;
            authorNameLF?: string;
            authors?: Array<{ id?: string; name?: string }>;
            description?: string;
            descriptionPlain?: string;
            genres?: string[];
            imageUrl?: string;
            language?: string;
            narratorName?: string;
            narrators?: string[];
            publishedYear?: number | string;
            publisher?: string;
            series?: Array<{ name?: string; sequence?: number | string }> | string;
            subtitle?: string;
            title?: string;
        };
        narratorName?: string;
        subtitle?: string;
        title?: string;
    };
    name?: string;
    numEpisodes?: number;
}

interface AudiobookshelfPodcastEpisode {
    audioFile?: {
        chapters?: Array<{ start: number; title?: string }>;
        duration?: number;
        mimeType?: string;
    };
    chapters?: Array<{ start: number; title?: string }>;
    description?: string;
    duration?: number;
    id?: string;
    index?: number;
    publishedAt?: number;
    season?: string;
    subtitle?: string;
    title?: string;
}

interface SubsonicAlbumDetail extends SubsonicCollectionMetadata {
    artist?: string;
    genre?: string;
    genres?: Array<{ name?: string }>;
    recordLabels?: Array<{ name?: string }>;
    song?: SubsonicSong[];
    year?: number;
}

interface SubsonicAlbumDetailBody {
    'subsonic-response'?: {
        album?: SubsonicAlbumDetail;
        error?: SubsonicError;
        status?: string;
    };
}

interface SubsonicCollectionMetadata {
    coverArt?: string;
    id?: number | string;
    name?: string;
}

interface SubsonicError {
    message?: string;
}

interface SubsonicArtistDetail extends SubsonicCollectionMetadata {
    album?: SubsonicAlbumSummary[];
    albumCount?: number;
    artistImageUrl?: string;
}

interface SubsonicArtistInfo2Body {
    'subsonic-response'?: {
        artistInfo2?: {
            biography?: string;
            largeImageUrl?: string;
            mediumImageUrl?: string;
            similarArtist?: SubsonicSimilarArtist[];
            smallImageUrl?: string;
        };
        error?: SubsonicError;
        status?: string;
    };
}

interface SubsonicSimilarArtist {
    coverArt?: string;
    id?: number | string;
    name?: string;
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

interface SubsonicSearch3Body {
    'subsonic-response'?: {
        error?: SubsonicError;
        searchResult3?: {
            song?: SubsonicSong[];
        };
        status?: string;
    };
}

interface SubsonicArtistDetailBody {
    'subsonic-response'?: {
        artist?: SubsonicArtistDetail;
        error?: SubsonicError;
        status?: string;
    };
}

interface SubsonicAlbumSummary extends SubsonicCollectionMetadata {
    artist?: string;
    title?: string;
    year?: number;
}

interface SubsonicPlaylistDetail extends SubsonicCollectionMetadata {
    comment?: string;
    entry?: SubsonicSong[];
    owner?: string;
    songCount?: number;
}

interface SubsonicPlaylistDetailBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        playlist?: SubsonicPlaylistDetail;
        status?: string;
    };
}

interface SubsonicSong extends SubsonicPlayableSong {
    discNumber?: number;
    duration?: number;
    track?: number;
}

interface SubsonicUpdatePlaylistBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        status?: string;
    };
}

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

const subsonicUrlWithMultiValueQuery = (
    authentication: ServerAuthenticationResult,
    path: string,
    query: Record<string, number | string | string[]> = {},
) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });

    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            value.forEach((entry) => params.append(key, entry));
            continue;
        }

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

    return subsonicUrl(authentication, 'getCoverArt.view', { id: coverArt, size: 640 });
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

const toSubsonicAlbumItem = (
    authentication: ServerAuthenticationResult,
    album: SubsonicAlbumSummary,
): MobileHomeItem[] => {
    const id = album.id?.toString();
    const title = album.name ?? album.title;

    if (!id || !title) {
        return [];
    }

    return [
        {
            artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt),
            id,
            source: getMobileContentSource(authentication),
            subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
            title,
            type: MobileHomeItemType.ALBUM,
        },
    ];
};

const getAudiobookshelfTitle = (item: AudiobookshelfLibraryItem, fallback: string) => {
    return item.media?.metadata?.title ?? item.media?.title ?? item.name ?? fallback;
};

const getAudiobookshelfAuthor = (item: AudiobookshelfLibraryItem) => {
    const metadata = item.media?.metadata;

    return (
        metadata?.authorName ??
        metadata?.authorNameLF ??
        metadata?.author ??
        metadata?.authors
            ?.map((author) => author.name)
            .filter(Boolean)
            .join(', ') ??
        item.media?.authorName ??
        item.media?.authors
            ?.map((author) => author.name)
            .filter(Boolean)
            .join(', ') ??
        metadata?.narratorName ??
        item.media?.narratorName
    );
};

const getAudiobookshelfNarrator = (item: AudiobookshelfLibraryItem) => {
    const metadata = item.media?.metadata;

    return (
        metadata?.narratorName ??
        metadata?.narrators?.filter(Boolean).join(', ') ??
        item.media?.narratorName
    );
};

const getAudiobookshelfDescription = (item: AudiobookshelfLibraryItem) => {
    const metadata = item.media?.metadata;
    const raw = metadata?.descriptionPlain ?? metadata?.description;

    if (!raw) {
        return undefined;
    }

    const stripped = raw
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return stripped.length > 0 ? stripped : undefined;
};

const getAudiobookshelfSeries = (item: AudiobookshelfLibraryItem) => {
    const series = item.media?.metadata?.series;

    if (typeof series === 'string') {
        return series.trim() || undefined;
    }

    if (Array.isArray(series)) {
        return series
            .map((entry) =>
                entry.sequence
                    ? `${entry.name} #${entry.sequence}`
                    : entry.name,
            )
            .filter((value): value is string => Boolean(value))
            .join(', ') || undefined;
    }

    return undefined;
};

const formatAudiobookshelfDurationSeconds = (durationSeconds: number | undefined) => {
    if (!durationSeconds || durationSeconds <= 0) {
        return undefined;
    }

    const totalMinutes = Math.round(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
        return `${hours} hr ${minutes} min`;
    }

    if (hours > 0) {
        return `${hours} hr`;
    }

    return `${minutes} min`;
};

const buildAudiobookshelfMetadataLines = (
    item: AudiobookshelfLibraryItem,
    type: MobileMediaDetailType.AUDIOBOOK | MobileMediaDetailType.PODCAST,
): string[] => {
    const metadata = item.media?.metadata;
    const lines: string[] = [];
    const narrator = getAudiobookshelfNarrator(item);
    const series = getAudiobookshelfSeries(item);
    const genres = metadata?.genres?.filter(Boolean).slice(0, 3).join(' · ');
    const duration = formatAudiobookshelfDurationSeconds(item.media?.duration);
    const publishedYear = metadata?.publishedYear ? String(metadata.publishedYear) : undefined;

    if (narrator) {
        lines.push(`Narrated by ${narrator}`);
    }

    if (series) {
        lines.push(series);
    }

    if (duration) {
        lines.push(duration);
    } else if (type === MobileMediaDetailType.PODCAST && item.numEpisodes) {
        lines.push(`${item.numEpisodes} episodes`);
    }

    if (publishedYear) {
        lines.push(publishedYear);
    }

    if (genres) {
        lines.push(genres);
    }

    if (metadata?.publisher) {
        lines.push(metadata.publisher);
    }

    if (metadata?.language) {
        lines.push(
            metadata.language.charAt(0).toUpperCase() + metadata.language.slice(1).toLowerCase(),
        );
    }

    return lines;
};

const getAudiobookshelfCoverUrl = (
    authentication: ServerAuthenticationResult,
    item: AudiobookshelfLibraryItem,
) => {
    return (
        item.media?.metadata?.imageUrl ??
        (item.id
            ? `${authentication.url}/api/items/${item.id}/cover?token=${encodeURIComponent(authentication.credential)}`
            : undefined)
    );
};

const toTimelineSegments = (
    chapters: Array<{ start: number; title?: string }> | undefined,
    duration: number | undefined,
    ownerId: string,
): MobilePlaybackSegment[] => {
    const orderedChapters = (chapters ?? [])
        .map((chapter, index) => ({ chapter, index }))
        .filter(
            ({ chapter }) =>
                Number.isFinite(chapter.start) &&
                chapter.start >= 0 &&
                (!duration || chapter.start < duration),
        )
        .sort((left, right) => left.chapter.start - right.chapter.start)
        .filter(
            ({ chapter }, index, ordered) =>
                index === 0 || chapter.start !== ordered[index - 1].chapter.start,
        );

    return orderedChapters.map(({ chapter, index }, orderedIndex) => {
        const nextStart = orderedChapters[orderedIndex + 1]?.chapter.start;
        const durationSeconds =
            nextStart !== undefined
                ? Math.max(0, nextStart - chapter.start)
                : duration
                  ? Math.max(0, duration - chapter.start)
                  : undefined;

        return {
            durationSeconds,
            id: `${ownerId}:chapter:${index}`,
            startSeconds: chapter.start,
            title: chapter.title?.trim() || `Chapter ${orderedIndex + 1}`,
        };
    });
};

const toAudiobookChapterTracks = (
    item: AudiobookshelfLibraryItem,
    artworkUrl: string | undefined,
    title: string,
): MobileMediaTrack[] => {
    const duration = item.media?.duration;
    const itemId = item.id;

    if (!itemId) {
        return [];
    }

    const timelineSegments = toTimelineSegments(item.media?.chapters, duration, itemId);

    if (timelineSegments.length === 0) {
        return [];
    }

    return timelineSegments.map((segment, orderedIndex) => {
        return {
            artworkUrl,
            durationSeconds: segment.durationSeconds,
            id: segment.id,
            itemId,
            startSeconds: segment.startSeconds,
            subtitle: title,
            timelineSegments,
            title: segment.title ?? `Chapter ${orderedIndex + 1}`,
            trackNumber: orderedIndex + 1,
        };
    });
};

const sortSubsonicSongs = (songs: SubsonicSong[]) => {
    return [...songs].sort((left, right) => {
        const leftDisc = left.discNumber ?? 0;
        const rightDisc = right.discNumber ?? 0;

        if (leftDisc !== rightDisc) {
            return leftDisc - rightDisc;
        }

        return (left.track ?? 0) - (right.track ?? 0);
    });
};

const toTrackItems = (
    authentication: ServerAuthenticationResult,
    songs: SubsonicSong[],
    fallbackArtworkUrl?: string,
): MobileMediaTrack[] => {
    return sortSubsonicSongs(songs).flatMap((song) => {
        const id = song.id?.toString();
        const artworkUrl = subsonicCoverArtUrl(authentication, song.coverArt) ?? fallbackArtworkUrl;
        const playback = buildSubsonicMusicPlayback(authentication, song, artworkUrl);

        if (!id || !song.title || !playback) {
            return [];
        }

        return {
            album: song.album,
            albumId: song.albumId?.toString() ?? song.parent?.toString(),
            artist: song.artist,
            artistId: song.artistId?.toString(),
            artworkUrl,
            durationSeconds: song.duration,
            id,
            playback,
            subtitle: [song.artist, song.album].filter(Boolean).join(' - '),
            title: song.title,
            trackNumber: song.track,
        };
    });
};

const loadSubsonicAlbumDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileMediaDetail> => {
    const body = await requestJson<SubsonicAlbumDetailBody>(
        fetcher,
        subsonicUrl(authentication, 'getAlbum.view', { id }),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load album');

    const album = response?.album;

    if (!album?.id || !album.name) {
        throw new Error('Album detail did not include a playable album.');
    }

    const artworkUrl = subsonicCoverArtUrl(authentication, album.coverArt);

    const recordLabel = album.recordLabels
        ?.map((entry) => entry.name?.trim())
        .filter((value): value is string => Boolean(value))[0];
    const genre =
        album.genre?.trim() ||
        album.genres
            ?.map((entry) => entry.name?.trim())
            .filter((value): value is string => Boolean(value))[0];
    const metadataLines = [
        album.artist,
        album.year ? String(album.year) : undefined,
        recordLabel ?? genre,
    ].filter((value): value is string => Boolean(value));

    return {
        artworkUrl,
        id: album.id.toString(),
        metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
        source: getMobileContentSource(authentication),
        subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
        title: album.name,
        tracks: toTrackItems(authentication, album.song ?? [], artworkUrl),
        type: MobileMediaDetailType.ALBUM,
    };
};

const loadSubsonicPlaylistDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileMediaDetail> => {
    const body = await requestJson<SubsonicPlaylistDetailBody>(
        fetcher,
        subsonicUrl(authentication, 'getPlaylist.view', { id }),
    );
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load playlist');

    const playlist = response?.playlist;

    if (!playlist?.id || !playlist.name) {
        throw new Error('Playlist detail did not include a playable playlist.');
    }

    const artworkUrl = subsonicCoverArtUrl(authentication, playlist.coverArt);

    return {
        artworkUrl,
        id: playlist.id.toString(),
        source: getMobileContentSource(authentication),
        subtitle: playlist.songCount ? `${playlist.songCount} songs` : playlist.owner,
        title: playlist.name,
        tracks: toTrackItems(authentication, playlist.entry ?? [], artworkUrl),
        type: MobileMediaDetailType.PLAYLIST,
    };
};

const TOP_SONGS_LIMIT = 8;

const sanitizeBiography = (raw: string | undefined): string | undefined => {
    if (!raw) return undefined;
    // last.fm biographies arrive with embedded <a> tags and a trailing
    // "Read more on Last.fm" link. Strip both so the mobile UI gets clean prose.
    const stripped = raw
        .replace(/<a [^>]*>[^<]*<\/a>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/User-contributed text is available under.*$/i, '')
        .trim();
    return stripped.length > 0 ? stripped : undefined;
};

const subsonicSongToTrack = (
    authentication: ServerAuthenticationResult,
    song: SubsonicSong,
    fallbackArtwork?: string,
): MobileMediaTrack | null => {
    const id = song.id?.toString();
    if (!id || !song.title) return null;
    const artworkUrl = subsonicCoverArtUrl(authentication, song.coverArt) ?? fallbackArtwork;
    const playback = buildSubsonicMusicPlayback(authentication, song, artworkUrl);
    return {
        album: song.album,
        albumId: song.albumId?.toString() ?? song.parent?.toString(),
        artist: song.artist,
        artistId: song.artistId?.toString(),
        artworkUrl,
        durationSeconds: song.duration,
        id,
        playback: playback ?? undefined,
        subtitle: [song.artist, song.album].filter(Boolean).join(' - '),
        title: song.title,
        trackNumber: song.track,
    };
};

const subsonicAppearsOnFromSongs = (
    authentication: ServerAuthenticationResult,
    artistName: string,
    artistId: string,
    songs: SubsonicSong[],
): MobileHomeItem[] => {
    const normalizedArtist = artistName.trim().toLowerCase();
    const seen = new Set<string>();
    const items: MobileHomeItem[] = [];
    for (const song of songs) {
        const albumId = (song.albumId ?? song.parent)?.toString();
        const albumTitle = song.album;
        if (!albumId || !albumTitle) continue;
        if (seen.has(albumId)) continue;

        const albumArtist = song.albumArtist?.trim().toLowerCase();
        const songArtist = song.artist?.trim().toLowerCase();
        const songArtistId = song.artistId?.toString();

        // The artist isn't credited on this song at all; their inclusion in the
        // search was probably a title match. Skip.
        if (songArtist && songArtist !== normalizedArtist && !songArtist.includes(normalizedArtist)) {
            continue;
        }

        // If the album artist matches this artist (by id or by name), it's a
        // mainline release, not an appearance. Same if the artistId on the song
        // matches and there's no separate albumArtist field.
        if (albumArtist === normalizedArtist) continue;
        if (!albumArtist && songArtistId && songArtistId === artistId) continue;
        if (!albumArtist && songArtist === normalizedArtist) continue;

        seen.add(albumId);
        items.push({
            artworkUrl: subsonicCoverArtUrl(authentication, song.coverArt),
            id: albumId,
            source: getMobileContentSource(authentication),
            subtitle: song.albumArtist ?? song.artist,
            title: albumTitle,
            type: MobileHomeItemType.ALBUM,
        });
    }
    return items;
};

const loadSubsonicArtistDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileMediaDetail> => {
    const [artistResult, infoResult] = await Promise.allSettled([
        requestJson<SubsonicArtistDetailBody>(
            fetcher,
            subsonicUrl(authentication, 'getArtist.view', { id }),
        ),
        requestJson<SubsonicArtistInfo2Body>(
            fetcher,
            subsonicUrl(authentication, 'getArtistInfo2.view', { id }),
        ),
    ]);

    if (artistResult.status === 'rejected') {
        throw artistResult.reason;
    }

    const response = artistResult.value['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load artist');

    const artist = response?.artist;

    if (!artist?.id || !artist.name) {
        throw new Error('Artist detail did not include an artist.');
    }

    // Pull two song sources in parallel:
    //  - getTopSongs: ordered by community plays, drives the Top Tracks list.
    //  - search3: broader haul of any song where this artist is credited,
    //    needed because getTopSongs often omits feature/guest appearances.
    const [topSongsResult, search3Result] = await Promise.all([
        requestJson<SubsonicTopSongsBody>(
            fetcher,
            subsonicUrl(authentication, 'getTopSongs.view', {
                artist: artist.name,
                count: TOP_SONGS_LIMIT * 4,
            }),
        ).catch(() => undefined),
        requestJson<SubsonicSearch3Body>(
            fetcher,
            subsonicUrl(authentication, 'search3.view', {
                albumCount: 0,
                artistCount: 0,
                query: artist.name,
                songCount: 200,
            }),
        ).catch(() => undefined),
    ]);

    const topSongsResponse =
        topSongsResult && topSongsResult['subsonic-response']?.status === 'ok'
            ? topSongsResult['subsonic-response']
            : undefined;
    const topSongs = topSongsResponse?.topSongs?.song ?? [];

    const searchSongs =
        search3Result && search3Result['subsonic-response']?.status === 'ok'
            ? (search3Result['subsonic-response'].searchResult3?.song ?? [])
            : [];

    const infoResponse =
        infoResult.status === 'fulfilled'
            ? infoResult.value['subsonic-response']?.artistInfo2
            : undefined;

    const albumItems = (artist.album ?? []).flatMap((album) =>
        toSubsonicAlbumItem(authentication, album),
    );
    const albumIds = new Set(albumItems.map((album) => album.id));
    const topTracks = topSongs
        .slice(0, TOP_SONGS_LIMIT)
        .map((song) => subsonicSongToTrack(authentication, song))
        .filter((track): track is MobileMediaTrack => Boolean(track));
    const appearsOnItems = subsonicAppearsOnFromSongs(
        authentication,
        artist.name,
        artist.id.toString(),
        [...topSongs, ...searchSongs],
    ).filter((item) => !albumIds.has(item.id));
    const relatedArtists = (infoResponse?.similarArtist ?? []).flatMap((similar) => {
        const similarId = similar.id?.toString();
        if (!similarId || !similar.name) return [];
        return [
            {
                artworkUrl: subsonicCoverArtUrl(authentication, similar.coverArt),
                id: similarId,
                source: getMobileContentSource(authentication),
                title: similar.name,
                type: MobileHomeItemType.ARTIST,
            } satisfies MobileHomeItem,
        ];
    });

    const subtitleParts = [
        artist.albumCount ? `${artist.albumCount} albums` : undefined,
        topTracks.length > 0 ? `${topTracks.length} top tracks` : undefined,
    ].filter(Boolean);

    return {
        appearsOnItems: appearsOnItems.length > 0 ? appearsOnItems : undefined,
        artworkUrl:
            infoResponse?.largeImageUrl ??
            infoResponse?.mediumImageUrl ??
            artist.artistImageUrl ??
            subsonicCoverArtUrl(authentication, artist.coverArt),
        biography: sanitizeBiography(infoResponse?.biography),
        id: artist.id.toString(),
        items: albumItems,
        relatedArtists: relatedArtists.length > 0 ? relatedArtists : undefined,
        source: getMobileContentSource(authentication),
        subtitle: subtitleParts.join(' · ') || undefined,
        title: artist.name,
        topTracks: topTracks.length > 0 ? topTracks : undefined,
        tracks: [],
        type: MobileMediaDetailType.ARTIST,
    };
};

const loadAudiobookshelfDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
    type: MobileMediaDetailType.AUDIOBOOK | MobileMediaDetailType.PODCAST,
): Promise<MobileMediaDetail> => {
    const item = await requestJson<AudiobookshelfLibraryItem>(
        fetcher,
        `${authentication.url}/api/items/${id}?expanded=1`,
        {
            headers: { Authorization: `Bearer ${authentication.credential}` },
            method: 'GET',
        },
    );

    if (!item.id) {
        throw new Error('Audiobookshelf did not return a playable item.');
    }

    const artworkUrl = getAudiobookshelfCoverUrl(authentication, item);
    const title = getAudiobookshelfTitle(
        item,
        type === MobileMediaDetailType.PODCAST ? 'Podcast' : 'Untitled audiobook',
    );

    const biography = getAudiobookshelfDescription(item);
    const metadataLines = buildAudiobookshelfMetadataLines(item, type);

    if (type === MobileMediaDetailType.AUDIOBOOK) {
        const chapters = toAudiobookChapterTracks(item, artworkUrl, title);

        return {
            artworkUrl,
            biography,
            id: item.id,
            metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
            source: getMobileContentSource(authentication),
            subtitle: getAudiobookshelfAuthor(item),
            title,
            tracks:
                chapters.length > 0
                    ? chapters
                    : [
                          {
                              artworkUrl,
                              durationSeconds: item.media?.duration,
                              id: item.id,
                              itemId: item.id,
                              subtitle: getAudiobookshelfAuthor(item),
                              title,
                              trackNumber: 1,
                          },
                      ],
            type,
        };
    }

    const episodes = [...(item.media?.episodes ?? [])].sort(
        (left, right) => (right.publishedAt ?? 0) - (left.publishedAt ?? 0),
    );

    return {
        artworkUrl,
        biography,
        id: item.id,
        metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
        source: getMobileContentSource(authentication),
        subtitle: item.numEpisodes ? `${item.numEpisodes} episodes` : item.media?.subtitle,
        title,
        tracks: episodes.flatMap((episode, index) => {
            if (!episode.id) {
                return [];
            }

            const durationSeconds = episode.duration ?? episode.audioFile?.duration;
            const timelineSegments = toTimelineSegments(
                episode.chapters ?? episode.audioFile?.chapters,
                durationSeconds,
                episode.id,
            );

            return {
                artworkUrl,
                durationSeconds,
                episodeId: episode.id,
                id: episode.id,
                itemId: item.id,
                publishedAt: episode.publishedAt,
                subtitle: episode.subtitle,
                timelineSegments: timelineSegments.length > 1 ? timelineSegments : undefined,
                title: episode.title ?? `Episode ${index + 1}`,
                trackNumber: episode.index ?? index + 1,
            };
        }),
        type,
    };
};

export const getMobileMediaDetailErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Failed to load media detail';
};

export const loadMobileMediaDetail = async ({
    authentication,
    fetch: fetcher,
    id,
    type,
}: MobileMediaDetailInput): Promise<MobileMediaDetail> => {
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        if (type === MobileMediaDetailType.AUDIOBOOK || type === MobileMediaDetailType.PODCAST) {
            return loadAudiobookshelfDetail(authentication, request, id, type);
        }

        throw new Error('Opening this Audiobookshelf media type is not wired for Android yet.');
    }

    if (
        authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC
    ) {
        if (type === MobileMediaDetailType.ALBUM) {
            return loadSubsonicAlbumDetail(authentication, request, id);
        }

        if (type === MobileMediaDetailType.PLAYLIST) {
            return loadSubsonicPlaylistDetail(authentication, request, id);
        }

        if (type === MobileMediaDetailType.ARTIST) {
            return loadSubsonicArtistDetail(authentication, request, id);
        }
    }

    throw new Error('Opening this media type is not wired for Android yet.');
};

interface SubsonicSimilarSongsBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        similarSongs2?: { song?: SubsonicSong[] };
        status?: string;
    };
}

interface SubsonicTopSongsByArtistBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        status?: string;
        topSongs?: { song?: SubsonicSong[] };
    };
}

export interface SongRadioSeed {
    albumId?: string;
    artist?: string;
    artistId?: string;
    songId: string;
}

export interface LoadSongRadioInput {
    authentication: ServerAuthenticationResult;
    count?: number;
    fetch?: SamoFetch;
    seed: SongRadioSeed;
}

const dedupePlayables = (items: MobilePlayableAudio[]): MobilePlayableAudio[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item.id)) {
            return false;
        }
        seen.add(item.id);
        return true;
    });
};

/**
 * Build a Song Radio queue. Uses Subsonic's getSimilarSongs2 as the primary
 * source and blends in the seed artist's top tracks when available, so the
 * queue feels grounded in the song instead of just being "loosely similar."
 */
export const loadSongRadioQueue = async ({
    authentication,
    count,
    fetch: fetcher,
    seed,
}: LoadSongRadioInput): Promise<MobilePlayableAudio[]> => {
    if (
        authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC
    ) {
        return [];
    }

    const request = getFetch(fetcher);
    const desired = Math.max(8, count ?? 24);
    const similarCount = Math.min(50, Math.ceil(desired * 1.5));

    const [similarResult, topSongsResult] = await Promise.allSettled([
        requestJson<SubsonicSimilarSongsBody>(
            request,
            subsonicUrl(authentication, 'getSimilarSongs2.view', {
                count: similarCount,
                id: seed.songId,
            }),
        ),
        seed.artistId
            ? requestJson<SubsonicTopSongsByArtistBody>(
                  request,
                  subsonicUrl(authentication, 'getTopSongs.view', {
                      artist: seed.artist ?? '',
                      count: 10,
                  }),
              )
            : Promise.resolve<SubsonicTopSongsByArtistBody>({}),
    ]);

    const similarSongs =
        similarResult.status === 'fulfilled'
            ? (similarResult.value['subsonic-response']?.similarSongs2?.song ?? [])
            : [];

    const topSongs =
        topSongsResult.status === 'fulfilled'
            ? (topSongsResult.value['subsonic-response']?.topSongs?.song ?? [])
            : [];

    const toPlayable = (song: SubsonicSong): MobilePlayableAudio | null => {
        const artworkUrl = subsonicCoverArtUrl(authentication, song.coverArt);
        return buildSubsonicMusicPlayback(authentication, song, artworkUrl);
    };

    const similarPlayables = similarSongs
        .map(toPlayable)
        .filter((value): value is MobilePlayableAudio => Boolean(value));

    const topPlayables = topSongs
        .map(toPlayable)
        .filter((value): value is MobilePlayableAudio => Boolean(value))
        // Drop the seed song itself — we'll thread it back in at position 0.
        .filter((value) => !value.id.endsWith(`:music:${seed.songId}`));

    // Light blend: alternate same-artist top tracks into the similar feed so
    // the queue isn't strictly "anything goes" but still varied.
    const blended: MobilePlayableAudio[] = [];
    const ratio = 3; // similar : top blend ratio
    let topIndex = 0;
    for (let i = 0; i < similarPlayables.length; i += 1) {
        blended.push(similarPlayables[i]);
        if ((i + 1) % ratio === 0 && topIndex < topPlayables.length) {
            blended.push(topPlayables[topIndex]);
            topIndex += 1;
        }
    }
    // Append any remaining top tracks at the end so they're still in rotation.
    for (; topIndex < topPlayables.length; topIndex += 1) {
        blended.push(topPlayables[topIndex]);
    }

    return dedupePlayables(blended).slice(0, desired);
};

export const addMobileTracksToPlaylist = async ({
    authentication,
    fetch: fetcher,
    playlistId,
    songIds,
}: AddMobileTracksToPlaylistInput): Promise<void> => {
    if (
        authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC
    ) {
        throw new Error('Adding tracks to playlists is only available for music servers.');
    }

    const filteredSongIds = songIds.filter(Boolean);

    if (filteredSongIds.length === 0) {
        throw new Error('No tracks were selected.');
    }

    const request = getFetch(fetcher);
    const body = await requestJson<SubsonicUpdatePlaylistBody>(
        request,
        subsonicUrlWithMultiValueQuery(authentication, 'updatePlaylist.view', {
            playlistId,
            songIdToAdd: filteredSongIds,
        }),
    );

    assertSubsonicOk(body['subsonic-response'], 'Failed to add to playlist');
};

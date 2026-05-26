import {
    resolveSamoAlbumArtworkUrl,
    resolveSamoArtistArtworkUrl,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPlaylistArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    resolveSamoStationArtworkUrl,
    type SamoAudiobook,
    type SamoInternetRadioStation,
    type SamoMusicAlbum,
    type SamoMusicArtist,
    type SamoMusicArtistRef,
    type SamoMusicPlaylist,
    type SamoMusicTrack,
    type SamoPodcast,
    type SamoPodcastEpisode,
} from '@samo/core/server';

import {
    type Album,
    type AlbumArtist,
    type Artist,
    type Genre,
    type InternetRadioStation,
    LibraryItem,
    type PartialIsoDateString,
    type Playlist,
    type RelatedArtist,
    type ServerListItemWithCredential,
    ServerType,
    type Song,
} from '/@/shared/types/domain-types';

// Map Samo's native `/api/v1/*` response shapes 1:1 into the renderer's
// internal types. These are NOT translations between server backends — they
// are just data binding for the UI components. Samo's field names appear
// directly on the wire and we slot them into the well-known internal types.

const toRelatedArtist = (ref: SamoMusicArtistRef): RelatedArtist => ({
    id: ref.id ?? '',
    imageId: null,
    imageUrl: null,
    name: ref.name ?? '',
    userFavorite: false,
    userRating: null,
});

const buildArtistList = (
    refs: SamoMusicArtistRef[] | undefined,
    fallbackName: string | undefined,
): RelatedArtist[] => {
    if (refs && refs.length > 0) {
        return refs.map(toRelatedArtist).filter((artist) => artist.id || artist.name);
    }
    if (!fallbackName) return [];
    return [
        {
            id: '',
            imageId: null,
            imageUrl: null,
            name: fallbackName,
            userFavorite: false,
            userRating: null,
        },
    ];
};

const joinNames = (refs: SamoMusicArtistRef[] | undefined): string => {
    if (!refs) return '';
    return refs
        .map((ref) => ref.name)
        .filter(Boolean)
        .join(', ');
};

/**
 * Samo ships parallel `albumArtistIds[]` + `albumArtistNames[]` arrays
 * rather than a single `[{id, name}]` shape — collapse them into the
 * structural refs the renderer's normalizers already understand.
 */
const refsFromParallelArrays = (
    ids: string[] | undefined,
    names: string[] | undefined,
    role?: string,
): SamoMusicArtistRef[] | undefined => {
    if (!ids && !names) return undefined;
    const length = Math.max(ids?.length ?? 0, names?.length ?? 0);
    if (length === 0) return undefined;
    const refs: SamoMusicArtistRef[] = [];
    for (let i = 0; i < length; i += 1) {
        refs.push({
            id: ids?.[i],
            name: names?.[i],
            ...(role ? { role } : {}),
        });
    }
    return refs;
};

const toAuthBundle = (server: null | ServerListItemWithCredential | undefined) =>
    server
        ? {
              credential: server.credential,
              ndCredential: server.ndCredential,
              url: server.url,
          }
        : null;

const toGenres = (
    names: string[] | undefined,
    server: null | ServerListItemWithCredential | undefined,
): Genre[] => {
    if (!names) return [];
    return names.map((name) => ({
        _itemType: LibraryItem.GENRE,
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.SAMO,
        albumCount: null,
        id: name,
        imageId: null,
        imageUrl: null,
        name,
        songCount: null,
    }));
};

const releaseYearFromDate = (date: string | undefined, year: number | undefined): null | number => {
    if (typeof year === 'number' && year > 0) return year;
    if (!date) return null;
    const parsed = Number.parseInt(date.slice(0, 4), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const releaseDate = (date: string | undefined): null | PartialIsoDateString => {
    return date && date.length > 0 ? date : null;
};

export const normalizeSamoMusicTrack = (
    track: SamoMusicTrack,
    server: null | ServerListItemWithCredential | undefined,
    options?: { albumName?: string; playlistIndex?: number },
): Song => {
    const audioFile = track.primaryAudioFile ?? track.audioFiles?.[0];
    const trackArtists = refsFromParallelArrays(track.artistIds, track.artistNames);
    const artistName = track.displayArtist ?? joinNames(trackArtists);
    const artists = buildArtistList(trackArtists, artistName);
    const release = {
        date: releaseDate(track.releaseDate),
        year: releaseYearFromDate(track.releaseDate, track.releaseYear),
    };
    const auth = toAuthBundle(server);
    const imageId = track.images?.[0]?.id ?? null;
    const imageUrl = auth
        ? (resolveSamoAlbumArtworkUrl(auth, {
              id: track.albumId ?? track.id,
              images: track.images,
          }) ?? null)
        : null;

    return {
        _itemType: LibraryItem.SONG,
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.SAMO,
        album: track.albumTitle ?? options?.albumName ?? null,
        albumArtistName: artistName,
        albumArtists: artists,
        albumId: track.albumId ?? '',
        artistName,
        artists,
        bitDepth: audioFile?.bitDepth ?? null,
        bitRate: audioFile?.bitrate ?? 0,
        bpm: track.bpm ?? null,
        channels: audioFile?.channels ?? null,
        comment: track.comment ?? null,
        compilation: null,
        container: audioFile?.container ?? null,
        createdAt: track.addedAt ?? new Date(0).toISOString(),
        discNumber: track.discNumber ?? 1,
        discSubtitle: null,
        duration: (track.durationSeconds ?? 0) * 1000,
        explicitStatus: null,
        gain: null,
        genres: toGenres(track.genres, server),
        id: track.id,
        imageId,
        imageUrl,
        lastPlayedAt: track.playback?.lastPlayedAt ?? null,
        lyrics: track.lyrics ?? null,
        mbzRecordingId: track.externalIds?.musicbrainzRecording ?? null,
        mbzTrackId: track.externalIds?.musicbrainzTrack ?? null,
        name: track.title,
        participants: null,
        path: audioFile?.path ?? null,
        peak: null,
        playCount: track.playback?.playCount ?? 0,
        playlistItemId:
            options?.playlistIndex !== undefined ? options.playlistIndex.toString() : undefined,
        releaseDate: release.date,
        releaseYear: release.year,
        sampleRate: audioFile?.sampleRate ?? null,
        size: audioFile?.sizeBytes ?? 0,
        sortName: track.sortName ?? track.title,
        tags: track.tags ? { tags: track.tags } : null,
        trackNumber: track.trackNumber ?? 1,
        trackSubtitle: track.trackSubtitle ?? null,
        updatedAt: track.updatedAt ?? track.addedAt ?? new Date(0).toISOString(),
        userFavorite: track.playback?.favorite ?? false,
        userRating: track.playback?.rating ?? null,
    };
};

export const normalizeSamoMusicAlbum = (
    album: SamoMusicAlbum,
    server: null | ServerListItemWithCredential | undefined,
): Album => {
    const release = {
        date: releaseDate(album.releaseDate),
        year: releaseYearFromDate(album.releaseDate, album.releaseYear),
    };
    const originalRelease = {
        date: releaseDate(album.originalReleaseDate) ?? release.date,
        year:
            releaseYearFromDate(album.originalReleaseDate, album.originalReleaseYear) ??
            release.year,
    };
    const albumArtistRefs = refsFromParallelArrays(album.albumArtistIds, album.albumArtistNames);
    const trackArtistRefs = refsFromParallelArrays(album.trackArtistIds, album.trackArtistNames);
    const albumArtistName = album.displayArtist ?? joinNames(albumArtistRefs) ?? 'Unknown Artist';
    const auth = toAuthBundle(server);
    const imageId = album.images?.[0]?.id ?? null;
    const imageUrl = auth
        ? (resolveSamoAlbumArtworkUrl(auth, { id: album.id, images: album.images }) ?? null)
        : null;

    return {
        _itemType: LibraryItem.ALBUM,
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.SAMO,
        albumArtistName,
        albumArtists: buildArtistList(albumArtistRefs, albumArtistName),
        artists: buildArtistList(trackArtistRefs ?? albumArtistRefs, albumArtistName),
        comment: null,
        createdAt: album.addedAt ?? new Date(0).toISOString(),
        duration: album.durationSeconds ? album.durationSeconds * 1000 : null,
        explicitStatus: null,
        genres: toGenres(album.genres, server),
        id: album.id,
        imageId,
        imageUrl,
        isCompilation: null,
        lastPlayedAt: album.playback?.lastPlayedAt ?? null,
        mbzId: album.externalIds?.musicbrainzAlbum ?? null,
        mbzReleaseGroupId: album.externalIds?.musicbrainzReleaseGroup ?? null,
        name: album.title,
        originalDate: originalRelease.date,
        originalYear: originalRelease.year ?? 0,
        participants: null,
        playCount: album.playback?.playCount ?? null,
        recordLabels: album.recordLabel ? [album.recordLabel] : [],
        releaseDate: release.date,
        releaseType: album.releaseType ?? null,
        releaseTypes: album.releaseType ? [album.releaseType] : [],
        releaseYear: release.year,
        size: album.sizeBytes ?? null,
        songCount: album.trackCount ?? album.tracks?.length ?? null,
        songs: album.tracks?.map((track) =>
            normalizeSamoMusicTrack(track, server, { albumName: album.title }),
        ),
        sortName: album.sortName ?? album.title,
        tags: album.tags ? { tags: album.tags } : null,
        updatedAt: album.updatedAt ?? album.addedAt ?? new Date(0).toISOString(),
        userFavorite: album.playback?.favorite ?? false,
        userRating: album.playback?.rating ?? null,
        version: null,
    };
};

export const normalizeSamoMusicArtist = (
    artist: SamoMusicArtist,
    server: null | ServerListItemWithCredential | undefined,
    role: LibraryItem.ALBUM_ARTIST | LibraryItem.ARTIST = LibraryItem.ALBUM_ARTIST,
): AlbumArtist | Artist => {
    const auth = toAuthBundle(server);
    const imageUrl = auth ? (resolveSamoArtistArtworkUrl(auth, artist) ?? null) : null;
    const base = {
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.SAMO,
        albumCount: artist.albumCount ?? 0,
        biography: artist.biography ?? null,
        duration: null,
        genres: toGenres(artist.genres, server),
        id: artist.id,
        imageId: artist.images?.[0]?.id ?? null,
        imageUrl,
        lastPlayedAt: artist.playback?.lastPlayedAt ?? null,
        mbz: artist.externalIds?.musicbrainzArtist ?? null,
        name: artist.name,
        playCount: artist.playback?.playCount ?? null,
        similarArtists: null,
        songCount: artist.trackCount ?? null,
        userFavorite: artist.playback?.favorite ?? false,
        userRating: artist.playback?.rating ?? null,
    };

    if (role === LibraryItem.ARTIST) {
        return { ...base, _itemType: LibraryItem.ARTIST } as Artist;
    }

    return { ...base, _itemType: LibraryItem.ALBUM_ARTIST } as AlbumArtist;
};

export const normalizeSamoMusicPlaylist = (
    playlist: SamoMusicPlaylist,
    server: null | ServerListItemWithCredential | undefined,
): Playlist => {
    const auth = toAuthBundle(server);
    const imageUrl = auth ? (resolveSamoPlaylistArtworkUrl(auth, playlist) ?? null) : null;
    return {
        _itemType: LibraryItem.PLAYLIST,
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.SAMO,
        createdAt: playlist.createdAt ?? null,
        description: playlist.description ?? null,
        duration: playlist.duration ? playlist.duration * 1000 : null,
        genres: [],
        id: playlist.id,
        imageId: playlist.images?.[0]?.id ?? null,
        imageUrl,
        name: playlist.name,
        owner: playlist.ownerName ?? null,
        ownerId: playlist.ownerId ?? null,
        public: playlist.public ?? null,
        size: null,
        songCount: playlist.trackCount ?? null,
        updatedAt: playlist.updatedAt ?? playlist.createdAt ?? null,
    };
};

export const normalizeSamoInternetRadioStation = (
    station: SamoInternetRadioStation,
    server?: null | ServerListItemWithCredential,
): InternetRadioStation => {
    const auth = toAuthBundle(server);
    const imageUrl = auth ? (resolveSamoStationArtworkUrl(auth, station) ?? null) : null;
    return {
        homepageUrl: station.homepageUrl ?? null,
        id: station.id,
        imageId: station.coverId ?? null,
        imageUrl,
        name: station.name,
        streamUrl: station.streamUrl ?? '',
    };
};

// Audiobooks + podcasts also normalize, but the renderer doesn't carry rich
// internal types for them today. We project into the closest shapes (Album /
// Playlist) so the existing music-focused UI can list them; per-domain detail
// screens will land in a follow-up that maps SamoAudiobook/SamoPodcast onto
// dedicated electron screens.

export const normalizeSamoAudiobookAsAlbum = (
    audiobook: SamoAudiobook,
    server: null | ServerListItemWithCredential | undefined,
): Album => {
    const authorName =
        audiobook.book?.authors
            ?.map((author) => author.name)
            .filter(Boolean)
            .join(', ') ?? 'Unknown Author';
    const authorArtists = buildArtistList(
        audiobook.book?.authors?.map((author) => ({
            id: author.id,
            name: author.name,
            role: 'author',
        })),
        authorName,
    );
    const audioFile = audiobook.primaryAudioFile ?? audiobook.audioFiles?.[0];
    const auth = toAuthBundle(server);
    const imageUrl = auth ? (resolveSamoAudiobookArtworkUrl(auth, audiobook) ?? null) : null;
    const publishedYear =
        typeof audiobook.book?.publishedYear === 'string'
            ? Number.parseInt(audiobook.book.publishedYear, 10)
            : audiobook.book?.publishedYear;

    return {
        _itemType: LibraryItem.ALBUM,
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.SAMO,
        albumArtistName: authorName,
        albumArtists: authorArtists,
        artists: authorArtists,
        comment: audiobook.book?.description ?? null,
        createdAt: audiobook.addedAt ?? new Date(0).toISOString(),
        duration: audiobook.durationSeconds ? audiobook.durationSeconds * 1000 : null,
        explicitStatus: null,
        genres: toGenres(audiobook.book?.genres ?? audiobook.genres, server),
        id: audiobook.id,
        imageId: audiobook.cover?.id ?? null,
        imageUrl,
        isCompilation: null,
        lastPlayedAt: audiobook.progress?.lastPlayedAt ?? null,
        mbzId: null,
        mbzReleaseGroupId: null,
        name: audiobook.book?.title ?? 'Untitled audiobook',
        originalDate: releaseDate(audiobook.book?.publishedDate),
        originalYear: Number.isFinite(publishedYear) ? (publishedYear as number) : 0,
        participants: null,
        playCount: audiobook.progress?.playCount ?? null,
        recordLabels: audiobook.book?.publisher ? [audiobook.book.publisher] : [],
        releaseDate: releaseDate(audiobook.book?.publishedDate),
        releaseType: 'audiobook',
        releaseTypes: ['audiobook'],
        releaseYear: Number.isFinite(publishedYear) ? (publishedYear as number) : null,
        size: audiobook.sizeBytes ?? audioFile?.sizeBytes ?? null,
        songCount: audiobook.chapters?.length ?? null,
        sortName: audiobook.book?.sortTitle ?? audiobook.book?.title ?? '',
        tags: audiobook.tags ? { tags: audiobook.tags } : null,
        updatedAt: audiobook.updatedAt ?? audiobook.addedAt ?? new Date(0).toISOString(),
        userFavorite: audiobook.progress?.favorite ?? false,
        userRating: audiobook.progress?.rating ?? null,
        version: null,
    };
};

export const normalizeSamoPodcastAsPlaylist = (
    podcast: SamoPodcast,
    server: null | ServerListItemWithCredential | undefined,
): Playlist => {
    const auth = toAuthBundle(server);
    const imageUrl = auth ? (resolveSamoPodcastArtworkUrl(auth, podcast) ?? null) : null;
    const inner = podcast.podcast;
    return {
        _itemType: LibraryItem.PLAYLIST,
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.SAMO,
        createdAt: podcast.addedAt ?? null,
        description: inner?.description ?? null,
        duration: null,
        genres: [],
        id: podcast.id,
        imageId: podcast.cover?.id ?? null,
        imageUrl,
        name: inner?.title ?? 'Untitled podcast',
        owner: inner?.author ?? null,
        ownerId: null,
        public: true,
        size: null,
        songCount: inner?.episodeCount ?? null,
        updatedAt: podcast.updatedAt ?? podcast.addedAt ?? null,
    };
};

export const normalizeSamoPodcastEpisodeAsSong = (
    episode: SamoPodcastEpisode,
    server: null | ServerListItemWithCredential | undefined,
    podcast?: { id: string; title?: string },
): Song => {
    const audioFile = episode.audioFiles?.[0];
    const publishedYear = episode.publishedAt
        ? Number.parseInt(episode.publishedAt.slice(0, 4), 10)
        : null;

    return {
        _itemType: LibraryItem.SONG,
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.SAMO,
        album: podcast?.title ?? episode.podcastTitle ?? null,
        albumArtistName: episode.podcastTitle ?? 'Podcast',
        albumArtists: [],
        albumId: podcast?.id ?? episode.podcastId ?? '',
        artistName: episode.podcastTitle ?? '',
        artists: [],
        bitDepth: audioFile?.bitDepth ?? null,
        bitRate: audioFile?.bitrate ?? 0,
        bpm: null,
        channels: audioFile?.channels ?? null,
        comment: episode.description ?? null,
        compilation: null,
        container: audioFile?.container ?? null,
        createdAt: episode.publishedAt ?? new Date(0).toISOString(),
        discNumber: 1,
        discSubtitle: null,
        duration: (episode.duration ?? 0) * 1000,
        explicitStatus: null,
        gain: null,
        genres: [],
        id: episode.id,
        imageId: podcast?.id ?? episode.podcastId ?? null,
        imageUrl: null,
        lastPlayedAt: episode.playback?.lastPlayedAt ?? null,
        lyrics: null,
        mbzRecordingId: null,
        mbzTrackId: null,
        name: episode.title ?? episode.name ?? 'Untitled episode',
        participants: null,
        path: audioFile?.path ?? null,
        peak: null,
        playCount: episode.playback?.playCount ?? 0,
        releaseDate: releaseDate(episode.publishedAt),
        releaseYear: publishedYear && Number.isFinite(publishedYear) ? publishedYear : null,
        sampleRate: audioFile?.sampleRate ?? null,
        size: audioFile?.sizeBytes ?? episode.enclosureSize ?? 0,
        sortName: episode.title ?? episode.name ?? '',
        tags: episode.tags ? { tags: episode.tags } : null,
        trackNumber: episode.episodeNumber ?? 1,
        trackSubtitle: episode.subtitle ?? null,
        updatedAt: episode.publishedAt ?? new Date(0).toISOString(),
        userFavorite: episode.playback?.favorite ?? false,
        userRating: episode.playback?.rating ?? null,
    };
};

export const samoNormalize = {
    album: normalizeSamoMusicAlbum,
    albumArtist: normalizeSamoMusicArtist,
    audiobookAsAlbum: normalizeSamoAudiobookAsAlbum,
    internetRadioStation: normalizeSamoInternetRadioStation,
    playlist: normalizeSamoMusicPlaylist,
    podcastAsPlaylist: normalizeSamoPodcastAsPlaylist,
    podcastEpisodeAsSong: normalizeSamoPodcastEpisodeAsSong,
    song: normalizeSamoMusicTrack,
};

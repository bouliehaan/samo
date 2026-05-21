import { coerceYear, parsePartialIsoDateFromApi } from '/@/shared/api/partial-iso-date';
import { replacePathPrefix } from '/@/shared/api/utils';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { ServerType } from '/@/shared/types/types';
const TICKS_PER_MS = 10000;
const KEYS_TO_OMIT = new Set(['AlbumArtist', 'Artist']);
const getPeople = (item) => {
    if (item.People) {
        const participants = {};
        for (const person of item.People) {
            const key = person.Type || '';
            if (KEYS_TO_OMIT.has(key)) {
                continue;
            }
            const item = {
                // for other roles, we just want to display this and not filter.
                // filtering (and links) would require a separate field, PersonIds
                id: '',
                imageId: null,
                imageUrl: null,
                name: person.Name,
                userFavorite: false,
                userRating: null,
            };
            if (key in participants) {
                participants[key].push(item);
            }
            else {
                participants[key] = [item];
            }
        }
        return participants;
    }
    return null;
};
const getTags = (item) => {
    if (item.Tags) {
        const tags = {};
        for (const tag of item.Tags) {
            tags[tag] = [];
        }
        return tags;
    }
    return null;
};
const getSongImageId = (item) => {
    if (item.ImageTags?.Primary) {
        return item.Id;
    }
    if (item.AlbumPrimaryImageTag && item.AlbumId) {
        return item.AlbumId;
    }
    return null;
};
const getAlbumImageId = (item) => {
    if (item.ImageTags?.Primary) {
        return item.Id;
    }
    return null;
};
const getAlbumArtistImageId = (item) => {
    if (item.ImageTags?.Primary) {
        return item.Id;
    }
    return null;
};
const getPlaylistImageId = (item) => {
    if (item.ImageTags?.Primary) {
        return item.Id;
    }
    return null;
};
const getArtists = (item, participants) => {
    if (!item?.ArtistItems?.length && !item.AlbumArtists && !participants) {
        return [];
    }
    const result = [];
    (item?.ArtistItems?.length ? item.ArtistItems : item.AlbumArtists)?.forEach((entry) => {
        result.push({
            id: entry.Id,
            imageId: null,
            imageUrl: null,
            name: entry.Name,
            userFavorite: false,
            userRating: null,
        });
    });
    if (participants?.['Remixer']) {
        const existingIds = new Set(result.map((artist) => artist.id));
        for (const participant of participants['Remixer']) {
            if (!existingIds.has(participant.id)) {
                result.push(participant);
            }
        }
    }
    return result;
};
const jellyfinPremiereFields = (item) => {
    const premiere = parsePartialIsoDateFromApi(item.PremiereDate ?? null);
    const prodYear = coerceYear(item.ProductionYear);
    const releaseYear = premiere.year > 0 ? premiere.year : prodYear > 0 ? prodYear : null;
    const releaseDate = premiere.date ?? (prodYear > 0 ? String(prodYear) : null);
    const originalYear = premiere.year > 0 ? premiere.year : prodYear;
    return { originalYear, releaseDate, releaseYear };
};
const normalizeSong = (item, server, pathReplace, pathReplaceWith) => {
    let bitDepth = null;
    let bitRate = 0;
    let channels = null;
    let container = null;
    let path = null;
    let sampleRate = null;
    let size = 0;
    if (item.MediaSources?.length) {
        const source = item.MediaSources[0];
        container = source.Container;
        path = source.Path;
        size = source.Size;
        if ((source.MediaStreams?.length || 0) > 0) {
            for (const stream of source.MediaStreams) {
                if (stream.Type === 'Audio') {
                    bitDepth = stream.BitDepth || null;
                    bitRate =
                        stream.BitRate !== undefined
                            ? Number(Math.trunc(stream.BitRate / 1000))
                            : 0;
                    channels = stream.Channels || null;
                    sampleRate = stream.SampleRate || null;
                    break;
                }
            }
        }
    }
    else {
        console.warn('Jellyfin song retrieved with no media sources', item);
    }
    const participants = getPeople(item);
    const artists = getArtists(item, participants);
    const { releaseDate, releaseYear } = jellyfinPremiereFields(item);
    return {
        _itemType: LibraryItem.SONG,
        _serverId: server?.id || '',
        _serverType: ServerType.JELLYFIN,
        album: item.Album,
        albumArtistName: item.AlbumArtist || '',
        albumArtists: item.AlbumArtists?.map((entry) => ({
            id: entry.Id,
            imageId: entry.Id,
            imageUrl: null,
            name: entry.Name,
            userFavorite: false,
            userRating: null,
        })),
        albumId: item.AlbumId || `dummy/${item.Id}`,
        artistName: item?.ArtistItems?.map((entry) => entry.Name).join(', ') || '',
        artists,
        bitDepth,
        bitRate,
        bpm: null,
        channels,
        comment: null,
        compilation: null,
        container,
        createdAt: item.DateCreated,
        discNumber: (item.ParentIndexNumber && item.ParentIndexNumber) || 1,
        discSubtitle: null,
        duration: item.RunTimeTicks / TICKS_PER_MS,
        explicitStatus: null,
        gain: item.NormalizationGain !== undefined
            ? {
                track: item.NormalizationGain,
            }
            : item.LUFS
                ? {
                    track: -18 - item.LUFS,
                }
                : null,
        genres: item.GenreItems?.map((entry) => ({
            _itemType: LibraryItem.GENRE,
            _serverId: server?.id || '',
            _serverType: ServerType.JELLYFIN,
            albumCount: null,
            id: entry.Id,
            imageId: null,
            imageUrl: null,
            name: entry.Name,
            songCount: null,
        })),
        id: item.Id,
        imageId: getSongImageId(item),
        imageUrl: null,
        lastPlayedAt: null,
        lyrics: null,
        mbzRecordingId: null,
        mbzTrackId: item.ProviderIds?.MusicBrainzTrack || null,
        name: item.Name,
        participants,
        path: replacePathPrefix(path || '', pathReplace, pathReplaceWith),
        peak: null,
        playCount: (item.UserData && item.UserData.PlayCount) || 0,
        playlistItemId: item.PlaylistItemId,
        releaseDate,
        releaseYear,
        sampleRate,
        size,
        sortName: item.SortName || item.Name,
        tags: getTags(item),
        trackNumber: item.IndexNumber,
        trackSubtitle: null,
        updatedAt: item.DateCreated,
        userFavorite: (item.UserData && item.UserData.IsFavorite) || false,
        userRating: null,
    };
};
const normalizeAlbum = (item, server, pathReplace, pathReplaceWith) => {
    const { originalYear, releaseDate, releaseYear } = jellyfinPremiereFields(item);
    return {
        _itemType: LibraryItem.ALBUM,
        _serverId: server?.id || '',
        _serverType: ServerType.JELLYFIN,
        albumArtistName: item.AlbumArtist,
        albumArtists: item.AlbumArtists.map((entry) => ({
            id: entry.Id,
            imageId: entry.Id,
            imageUrl: null,
            name: entry.Name,
            userFavorite: false,
            userRating: null,
        })) || [],
        artists: (item.ArtistItems?.length ? item.ArtistItems : item.AlbumArtists)?.map((entry) => ({
            id: entry.Id,
            imageId: entry.Id,
            imageUrl: null,
            name: entry.Name,
            userFavorite: false,
            userRating: null,
        })),
        comment: null,
        createdAt: item.DateCreated,
        duration: item.RunTimeTicks / TICKS_PER_MS,
        explicitStatus: null,
        genres: item.GenreItems?.map((entry) => ({
            _itemType: LibraryItem.GENRE,
            _serverId: server?.id || '',
            _serverType: ServerType.JELLYFIN,
            albumCount: null,
            id: entry.Id,
            imageId: null,
            imageUrl: null,
            name: entry.Name,
            songCount: null,
        })) || [],
        id: item.Id,
        imageId: getAlbumImageId(item),
        imageUrl: null,
        isCompilation: null,
        lastPlayedAt: null,
        mbzId: item.ProviderIds?.MusicBrainzAlbum || null,
        mbzReleaseGroupId: item.ProviderIds?.MusicBrainzReleaseGroup || null,
        name: item.Name,
        originalDate: releaseDate,
        originalYear,
        participants: getPeople(item),
        playCount: item.UserData?.PlayCount || 0,
        recordLabels: item.Studios?.map((entry) => entry.Name) || [],
        releaseDate,
        releaseType: null,
        releaseTypes: [],
        releaseYear,
        size: null,
        songCount: item?.ChildCount || null,
        songs: item.Songs?.map((song) => normalizeSong(song, server, pathReplace, pathReplaceWith)),
        sortName: item.SortName || item.Name,
        tags: getTags(item),
        updatedAt: item?.DateLastMediaAdded || item.DateCreated,
        userFavorite: item.UserData?.IsFavorite || false,
        userRating: null,
        version: null,
    };
};
const normalizeAlbumArtist = (item, server) => {
    const similarArtists = item.similarArtists?.Items?.filter((entry) => entry.Name !== 'Various Artists').map((entry) => ({
        id: entry.Id,
        imageId: getAlbumArtistImageId(entry),
        imageUrl: null,
        name: entry.Name,
        userFavorite: entry.UserData?.IsFavorite || false,
        userRating: null,
    })) || [];
    return {
        _itemType: LibraryItem.ALBUM_ARTIST,
        _serverId: server?.id || '',
        _serverType: ServerType.JELLYFIN,
        albumCount: item.AlbumCount ?? null,
        biography: item.Overview || null,
        duration: item.RunTimeTicks / TICKS_PER_MS,
        genres: item.GenreItems?.map((entry) => ({
            _itemType: LibraryItem.GENRE,
            _serverId: server?.id || '',
            _serverType: ServerType.JELLYFIN,
            albumCount: null,
            id: entry.Id,
            imageId: null,
            imageUrl: null,
            name: entry.Name,
            songCount: null,
        })),
        id: item.Id,
        imageId: getAlbumArtistImageId(item),
        imageUrl: null,
        lastPlayedAt: null,
        mbz: item.ProviderIds?.MusicBrainzArtist || null,
        name: item.Name,
        playCount: item.UserData?.PlayCount || 0,
        similarArtists,
        songCount: item.SongCount ?? null,
        userFavorite: item.UserData?.IsFavorite || false,
        userRating: null,
    };
};
const normalizePlaylist = (item, server) => {
    return {
        _itemType: LibraryItem.PLAYLIST,
        _serverId: server?.id || '',
        _serverType: ServerType.JELLYFIN,
        createdAt: item.DateCreated,
        description: item.Overview || null,
        duration: item.RunTimeTicks / TICKS_PER_MS,
        genres: item.GenreItems?.map((entry) => ({
            _itemType: LibraryItem.GENRE,
            _serverId: server?.id || '',
            _serverType: ServerType.JELLYFIN,
            albumCount: null,
            id: entry.Id,
            imageId: null,
            imageUrl: null,
            name: entry.Name,
            songCount: null,
        })),
        id: item.Id,
        imageId: getPlaylistImageId(item),
        imageUrl: null,
        name: item.Name,
        owner: null,
        ownerId: null,
        public: null,
        rules: null,
        size: null,
        songCount: item?.ChildCount || null,
        sync: null,
        updatedAt: item.DateCreated,
    };
};
const normalizeMusicFolder = (item) => {
    return {
        id: item.Id,
        name: item.Name,
    };
};
// const normalizeArtist = (item: any) => {
//   return {
//     album: (item.album || []).map((entry: any) => normalizeAlbum(entry)),
//     albumCount: item.AlbumCount,
//     duration: item.RunTimeTicks / 10000000,
//     genre: item.GenreItems && item.GenreItems.map((entry: any) => normalizeItem(entry)),
//     id: item.Id,
//     image: getCoverArtUrl(item),
//     info: {
//       biography: item.Overview,
//       externalUrl: (item.ExternalUrls || []).map((entry: any) => normalizeItem(entry)),
//       imageUrl: undefined,
//       similarArtist: (item.similarArtist || []).map((entry: any) => normalizeArtist(entry)),
//     },
//     starred: item.UserData && item.UserData?.IsFavorite ? 'true' : undefined,
//     title: item.Name,
//     uniqueId: nanoid(),
//   };
// };
const getGenreImageId = (item) => {
    if (item.ImageTags?.Primary) {
        return item.Id;
    }
    return null;
};
const normalizeGenre = (item, server) => {
    return {
        _itemType: LibraryItem.GENRE,
        _serverId: server?.id || '',
        _serverType: ServerType.JELLYFIN,
        albumCount: null,
        id: item.Id,
        imageId: getGenreImageId(item),
        imageUrl: null,
        name: item.Name,
        songCount: null,
    };
};
const normalizeFolder = (item, server) => {
    return {
        _itemType: LibraryItem.FOLDER,
        _serverId: server?.id || 'unknown',
        _serverType: ServerType.JELLYFIN,
        children: undefined,
        id: item.Id,
        name: item.Name || 'Unknown folder',
        parentId: item.ParentId,
    };
};
// const normalizeScanStatus = () => {
//   return {
//     count: 'N/a',
//     scanning: false,
//   };
// };
export const jfNormalize = {
    album: normalizeAlbum,
    albumArtist: normalizeAlbumArtist,
    folder: normalizeFolder,
    genre: normalizeGenre,
    musicFolder: normalizeMusicFolder,
    playlist: normalizePlaylist,
    song: normalizeSong,
};

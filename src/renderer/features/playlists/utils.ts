import { Album, LibraryItem, Song } from '/@/shared/types/domain-types';

export type PlaylistAlbumRow = Album & { _playlistSongs?: Song[] };

export function playlistSongsToAlbums(songs: Song[]): PlaylistAlbumRow[] {
    if (songs.length === 0) return [];

    const rows: PlaylistAlbumRow[] = [];
    let group: Song[] = [songs[0]];
    let prevAlbumId = songs[0].albumId;

    const pushRow = (song: Song, groupSongs: Song[]) => {
        rows.push({
            _itemType: LibraryItem.ALBUM,
            _playlistSongs: groupSongs,
            _serverId: song._serverId,
            albumArtistName: song.albumArtistName,
            albumArtists: song.albumArtists,
            artists: song.artists,
            comment: song.comment,
            createdAt: song.createdAt,
            duration: null,
            explicitStatus: song.explicitStatus,
            genres: song.genres,
            id: song.albumId,
            imageId: song.imageId,
            imageUrl: song.imageUrl,
            isCompilation: song.compilation,
            lastPlayedAt: song.lastPlayedAt,
            mbzId: null,
            mbzReleaseGroupId: null,
            name: song.album ?? '',
            originalDate: null,
            originalYear: 0,
            participants: song.participants,
            playCount: null,
            recordLabels: [],
            releaseDate: song.releaseDate,
            releaseType: null,
            releaseTypes: [],
            releaseYear: song.releaseYear,
            size: null,
            songCount: null,
            sortName: song.album ?? '',
            tags: song.tags,
            updatedAt: song.updatedAt,
            userFavorite: false,
            version: null,
        });
    };

    for (let i = 1; i < songs.length; i++) {
        const song = songs[i];
        if (song.albumId === prevAlbumId) {
            group.push(song);
        } else {
            pushRow(group[0], group);
            group = [song];
            prevAlbumId = song.albumId;
        }
    }
    pushRow(group[0], group);

    return rows;
}

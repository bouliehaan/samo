import { AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { Album, AlbumArtist, Artist, Folder, Genre, InternetRadioStation, LibraryItem, Playlist, QueueSong, ServerListItemWithCredential, Song } from '/@/shared/types/domain-types';
interface ContextMenuControllerProps {
    cmd: ContextMenuCommand;
    event: React.MouseEvent<unknown>;
}
export declare const ContextMenuController: {
    Root: import("react").FunctionComponent<{}>;
    call: (props: ContextMenuControllerProps) => Promise<void>;
    upsert: (props: ContextMenuControllerProps) => Promise<void>;
    end: ((promise: Promise<void>, response: void) => void) & ((response: void) => void);
    update: ((promise: Promise<void>, props: Partial<ContextMenuControllerProps>) => void) & ((props: Partial<ContextMenuControllerProps>) => void);
};
export type ContextMenuCommand = AlbumArtistContextMenuProps | AlbumContextMenuProps | ArtistContextMenuProps | AudiobookContextMenuProps | FolderContextMenuProps | GenreContextMenuProps | PlaylistContextMenuProps | PlaylistSongContextMenuProps | PodcastContextMenuProps | QueueSongContextMenuProps | RadioContextMenuProps | RecentItemContextMenuProps | SongContextMenuProps;
type AlbumArtistContextMenuProps = {
    items: AlbumArtist[];
    type: LibraryItem.ALBUM_ARTIST;
};
type AlbumContextMenuProps = {
    items: Album[];
    type: LibraryItem.ALBUM;
};
type ArtistContextMenuProps = {
    items: Artist[];
    type: LibraryItem.ARTIST;
};
type AudiobookContextMenuProps = {
    items: AudiobookshelfLibraryItem[];
    server: ServerListItemWithCredential;
    type: 'audiobook';
};
type FolderContextMenuProps = {
    items: Folder[];
    type: LibraryItem.FOLDER;
};
type GenreContextMenuProps = {
    items: Genre[];
    type: LibraryItem.GENRE;
};
type PlaylistContextMenuProps = {
    items: Playlist[];
    type: LibraryItem.PLAYLIST;
};
type PlaylistSongContextMenuProps = {
    items: Song[];
    type: LibraryItem.PLAYLIST_SONG;
};
type PodcastContextMenuProps = {
    items: AudiobookshelfLibraryItem[];
    server: ServerListItemWithCredential;
    type: 'podcast';
};
type QueueSongContextMenuProps = {
    items: QueueSong[];
    type: LibraryItem.QUEUE_SONG;
};
type RadioContextMenuProps = {
    items: InternetRadioStation[];
    serverId: string;
    type: 'radio';
};
type RecentItemContextMenuProps = {
    onOpen?: () => void;
    recentItemKey: string;
    type: 'recent';
};
type SongContextMenuProps = {
    items: Song[];
    recentItemKey?: string;
    type: LibraryItem.SONG;
};
export {};

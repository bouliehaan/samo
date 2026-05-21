import { AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { Album, AlbumArtist, InternetRadioStation, LibraryItem, Playlist, RelatedAlbumArtist, RelatedArtist, ServerType, Song } from '/@/shared/types/domain-types';
export type PlayHistoryEntryType = RecentItemType;
export interface PlayHistoryRef {
    itemId: string;
    serverId: string;
    type: PlayHistoryEntryType;
}
export type RecentArtwork = {
    fallbackIcon: 'metadata' | 'microphone';
    itemId: string;
    kind: 'abs';
} | {
    fallbackIconKey: string;
    kind: 'icon';
} | {
    imageId?: null | string;
    imageItemType: LibraryItem;
    imageUrl?: null | string;
    kind: 'music';
    serverId?: null | string;
    shape?: 'circle' | 'square';
};
export interface RecentItem {
    artwork: RecentArtwork;
    itemId: string;
    key: string;
    mediaType: RecentItemType;
    radioStreamUrl?: string;
    rawAbsItem?: AudiobookshelfLibraryItem;
    selectedAt: number;
    serverId: string;
    song?: Song;
    subtitle: string;
    title: string;
}
export type RecentItemInput = Omit<RecentItem, 'key' | 'selectedAt'> & {
    selectedAt?: number;
};
export type RecentItemType = 'album' | 'artist' | 'audiobook' | 'playlist' | 'podcast' | 'radio' | 'song';
export declare const playHistoryKey: ({ itemId, serverId, type }: PlayHistoryRef) => string;
interface PlayHistoryState {
    actions: {
        clear: () => void;
        pruneStale: (args: {
            knownItemIds: Set<string>;
            mediaType: RecentItemType;
            serverId: string;
        }) => void;
        record: (entry: RecentItemInput) => void;
        remove: (key: string) => void;
    };
    items: RecentItem[];
}
export declare const usePlayHistoryStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<PlayHistoryState>, "setState" | "persist"> & {
    setState(partial: PlayHistoryState | Partial<PlayHistoryState> | ((state: PlayHistoryState) => PlayHistoryState | Partial<PlayHistoryState>), replace?: false | undefined): unknown;
    setState(state: PlayHistoryState | ((state: PlayHistoryState) => PlayHistoryState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<PlayHistoryState, {
            items: RecentItem[];
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: PlayHistoryState) => void) => () => void;
        onFinishHydration: (fn: (state: PlayHistoryState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<PlayHistoryState, {
            items: RecentItem[];
        }, unknown>>;
    };
}>;
export declare const recordRecentItem: (entry: RecentItemInput) => void;
export declare const useRecentItems: () => RecentItem[];
export declare const recordRecentAlbum: (album: Album) => void;
export declare const recordRecentArtist: (artist: AlbumArtist | RelatedAlbumArtist | RelatedArtist, fallback?: {
    serverId?: string;
    serverType?: ServerType;
}) => void;
export declare const recordRecentPlaylist: (playlist: Playlist) => void;
export declare const recordRecentSong: (song: Song) => void;
export declare const recordRecentRadioStation: (station: InternetRadioStation, serverId: string) => void;
export declare const recordRecentAudiobook: (item: AudiobookshelfLibraryItem, serverId: string) => void;
export declare const recordRecentPodcast: (item: AudiobookshelfLibraryItem, serverId: string) => void;
export {};

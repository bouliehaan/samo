import { QueryClient } from '@tanstack/react-query';
import { AddToQueueType, type MusicPlaybackContext } from '/@/renderer/store';
import { LibraryItem, QueueSong, Song } from '/@/shared/types/domain-types';
import { PlayerRepeat, PlayerShuffle } from '/@/shared/types/types';
export interface PlayerContext {
    addToQueueByData: (data: Song[], type: AddToQueueType, playSongId?: string, 
    /**
     * Optional override for the playback context. Only meaningful for fresh-start play
     * types (`Play.NOW` / `Play.SHUFFLE`); ignored for additive ones. Pass an `album`
     * or `playlist` context when you have the full song list for that source — without
     * it the player falls back to `SONG_CONTEXT` and the queue is treated as ad-hoc
     * (not persisted across launches).
     */
    context?: MusicPlaybackContext) => void;
    addToQueueByFetch: (serverId: string, id: string[], itemType: LibraryItem, type: AddToQueueType) => void;
    addToQueueByListQuery: (serverId: string, query: any, itemType: LibraryItem, type: AddToQueueType) => Promise<void>;
    clearQueue: () => void;
    clearSelected: (items: QueueSong[]) => void;
    decreaseVolume: (amount: number) => void;
    increaseVolume: (amount: number) => void;
    mediaNext: () => void;
    mediaPause: () => void;
    mediaPlay: (id?: string) => void;
    mediaPlayByIndex: (index: number) => void;
    mediaPrevious: () => void;
    mediaSeekToTimestamp: (timestamp: number) => void;
    mediaSkipBackward: () => void;
    mediaSkipForward: () => void;
    mediaStop: (options?: {
        reset?: boolean;
    }) => void;
    mediaToggleMute: () => void;
    mediaTogglePlayPause: () => void;
    moveSelectedTo: (items: QueueSong[], edge: 'bottom' | 'top', uniqueId: string) => void;
    moveSelectedToBottom: (items: QueueSong[]) => void;
    moveSelectedToNext: (items: QueueSong[]) => void;
    moveSelectedToTop: (items: QueueSong[]) => void;
    setQueue: (data: Song[], index?: number, position?: number) => void;
    setRepeat: (repeat: PlayerRepeat) => void;
    setShuffle: (shuffle: PlayerShuffle) => void;
    setSpeed: (speed: number) => void;
    setVolume: (volume: number) => void;
    shuffle: () => void;
    shuffleAll: () => void;
    shuffleSelected: (items: QueueSong[]) => void;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
}
export declare const PlayerContext: import("react").Context<PlayerContext>;
export declare const PlayerProvider: ({ children }: {
    children: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const usePlayer: () => PlayerContext;
/**
 * Fetches the songs from the server
 * @param queryClient - The query client to use to fetch the data
 * @param serverId - The library id to use to fetch the data
 * @param type - The type of the item to add to the queue
 * @param args - The arguments to use to fetch the data
 * @returns The songs to add to the queue
 */
export declare function fetchSongsByItemType(queryClient: QueryClient, serverId: string, args: {
    id: string[];
    itemType: LibraryItem;
    params?: Record<string, any>;
}): Promise<Song[]>;
export declare const useIsPlayerFetching: () => boolean;

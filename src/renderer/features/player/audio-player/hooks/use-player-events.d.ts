import { LibraryItem, QueueData, QueueSong, Song } from '/@/shared/types/domain-types';
import { PlayerRepeat, PlayerShuffle, PlayerStatus } from '/@/shared/types/types';
interface PlayerEventsCallbacks {
    onCurrentSongChange?: (properties: {
        index: number;
        song: QueueSong | undefined;
    }, prev: {
        index: number;
        song: QueueSong | undefined;
    }) => void;
    onMediaNext?: (properties: {
        currentIndex: number;
        nextIndex: number;
    }) => void;
    onMediaPrev?: (properties: {
        currentIndex: number;
        prevIndex: number;
    }) => void;
    onNextSongInsertion?: (song: QueueSong | undefined) => void;
    onPlayerMute?: (properties: {
        muted: boolean;
    }, prev: {
        muted: boolean;
    }) => void;
    onPlayerPlay?: (properties: {
        id: string;
        index: number;
    }) => void;
    onPlayerProgress?: (properties: {
        timestamp: number;
    }, prev: {
        timestamp: number;
    }) => void;
    onPlayerQueueChange?: (queue: QueueData, prev: QueueData) => void;
    onPlayerRepeat?: (properties: {
        repeat: PlayerRepeat;
    }, prev: {
        repeat: PlayerRepeat;
    }) => void;
    onPlayerRepeated?: (properties: {
        index: number;
    }) => void;
    onPlayerSeek?: (properties: {
        seconds: number;
    }, prev: {
        seconds: number;
    }) => void;
    onPlayerSeekToTimestamp?: (properties: {
        timestamp: number;
    }, prev?: {
        timestamp: number;
    }) => void;
    onPlayerShuffle?: (properties: {
        shuffle: PlayerShuffle;
    }, prev: {
        shuffle: PlayerShuffle;
    }) => void;
    onPlayerSpeed?: (properties: {
        speed: number;
    }, prev: {
        speed: number;
    }) => void;
    onPlayerStatus?: (properties: {
        status: PlayerStatus;
    }, prev: {
        status: PlayerStatus;
    }) => void;
    onPlayerVolume?: (properties: {
        volume: number;
    }, prev: {
        volume: number;
    }) => void;
    onQueueCleared?: () => void;
    onQueueRestored?: (properties: {
        data: Song[];
        index: number;
        position: number;
    }) => void;
    onUserFavorite?: (properties: {
        favorite: boolean;
        id: string[];
        itemType: LibraryItem;
        serverId: string;
    }) => void;
    onUserRating?: (properties: {
        id: string[];
        itemType: LibraryItem;
        rating: null | number;
        serverId: string;
    }) => void;
}
export declare function usePlayerEvents(callbacks: PlayerEventsCallbacks, deps: React.DependencyList): void;
export {};

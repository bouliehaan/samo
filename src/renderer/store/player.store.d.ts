import { subscribePlayerSeek } from '/@/renderer/store/player/seek';
import { type PlayerTransportSlice } from '/@/renderer/store/player/slices';
import { type MusicPlaybackContext } from '/@/renderer/store/last-playback-session.store';
import { QueueGroupingProperty } from '/@/renderer/store/player-derived';
export type { GroupedQueue, QueueGroupingProperty } from '/@/renderer/store/player-derived';
export { calculateNextSong, isShuffleEnabled, mapShuffledToQueueIndex, } from '/@/renderer/store/player-queue-math';
import { PlayerData, QueueData, QueueSong, Song } from '/@/shared/types/domain-types';
import { CrossfadeStyle, Play, PlayerRepeat, PlayerShuffle, PlayerStatus, PlayerStyle } from '/@/shared/types/types';
export interface PlayerState extends Actions, PlayerDataState {
}
interface Actions {
    addToQueueByType: (items: Song[], playType: Play, playSongId?: string, 
    /**
     * Optional context describing the source (album/playlist) the user invoked.
     * Only consulted for fresh-start play types (`Play.NOW`, `Play.SHUFFLE`); additive
     * play types (LAST, NEXT, etc.) preserve the current context. When fresh-start
     * fires without an explicit context the player resets to `SONG_CONTEXT` — this is
     * what keeps an old album context from bleeding into an unrelated single-track play.
     */
    context?: MusicPlaybackContext) => void;
    addToQueueByUniqueId: (items: Song[], uniqueId: string, edge: 'bottom' | 'top', playSongId?: string) => void;
    clearQueue: () => void;
    clearSelected: (items: QueueSong[]) => void;
    decreaseVolume: (value: number) => void;
    increaseVolume: (value: number) => void;
    mediaAutoNext: () => PlayerData;
    mediaNext: () => void;
    mediaPause: () => void;
    mediaPlay: (id?: string) => void;
    mediaPlayByIndex: (index: number) => void;
    mediaPrevious: () => void;
    mediaSeekToTimestamp: (timestamp: number) => void;
    mediaSkipBackward: (offset?: number) => void;
    mediaSkipForward: (offset?: number) => void;
    /**
     * @param options.reset - When true (default), emits PLAYER_SEEK(0) so the engine seeks to start.
     * Timestamp display is always cleared to 0. Use false when the engine is already idle (e.g. mpv `stopped`) to skip that seek.
     */
    mediaStop: (options?: {
        reset?: boolean;
    }) => void;
    mediaToggleMute: () => void;
    mediaTogglePlayPause: () => void;
    moveSelectedTo: (items: QueueSong[], uniqueId: string, edge: 'bottom' | 'top') => void;
    moveSelectedToBottom: (items: QueueSong[]) => void;
    moveSelectedToNext: (items: QueueSong[]) => void;
    moveSelectedToTop: (items: QueueSong[]) => void;
    setCrossfadeDuration: (duration: number) => void;
    setCrossfadeStyle: (style: CrossfadeStyle) => void;
    setMusicPlaybackContext: (context: MusicPlaybackContext) => void;
    setPauseOnNextSongEnd: (value: boolean) => void;
    setQueue: (data: Song[], index?: number, position?: number, 
    /** Defaults to `SONG_CONTEXT` — `setQueue` is always a fresh start. */
    context?: MusicPlaybackContext, 
    /**
     * When false, the queue is seeded paused — used by launch-time session restore
     * (one-track lifeboat) so the user can press play to resume rather than having
     * audio start unprompted. Defaults to true (user-initiated playback).
     */
    autoPlay?: boolean) => void;
    setRepeat: (repeat: PlayerRepeat) => void;
    setShuffle: (shuffle: PlayerShuffle) => void;
    setSpeed: (speed: number) => void;
    setTransitionType: (transitionType: PlayerStyle) => void;
    setVolume: (volume: number) => void;
    shuffle: () => void;
    shuffleAll: () => void;
    shuffleSelected: (items: QueueSong[]) => void;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
}
interface PlayerDataState {
    hydrated: boolean;
    playbackSnapshot: PlayerData;
    /** Transport slice (F8): status, volume, index, repeat, shuffle — not queue contents. */
    player: PlayerTransportSlice;
    /** Queue slice (F8): song map, order, shuffle mapping. */
    queue: QueueData;
}
export declare const usePlayerStoreBase: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<Omit<Omit<import("zustand").StoreApi<PlayerState>, "setState" | "persist"> & {
    setState(partial: PlayerState | Partial<PlayerState> | ((state: PlayerState) => PlayerState | Partial<PlayerState>), replace?: false | undefined): unknown;
    setState(state: PlayerState | ((state: PlayerState) => PlayerState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<PlayerState, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: PlayerState) => void) => () => void;
        onFinishHydration: (fn: (state: PlayerState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<PlayerState, unknown, unknown>>;
    };
}, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: PlayerState, previousSelectedState: PlayerState) => void): () => void;
        <U>(selector: (state: PlayerState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: PlayerState | Partial<PlayerState> | ((state: import("immer").WritableDraft<PlayerState>) => void), shouldReplace?: false): unknown;
    setState(nextStateOrUpdater: PlayerState | ((state: import("immer").WritableDraft<PlayerState>) => void), shouldReplace: true): unknown;
}>;
export declare const usePlayerStore: {
    (): PlayerState;
    <U>(selector: (state: PlayerState) => U, equalityFn?: ((a: U, b: U) => boolean) | undefined): U;
} & Omit<Omit<Omit<import("zustand").StoreApi<PlayerState>, "setState" | "persist"> & {
    setState(partial: PlayerState | Partial<PlayerState> | ((state: PlayerState) => PlayerState | Partial<PlayerState>), replace?: false | undefined): unknown;
    setState(state: PlayerState | ((state: PlayerState) => PlayerState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<PlayerState, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: PlayerState) => void) => () => void;
        onFinishHydration: (fn: (state: PlayerState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<PlayerState, unknown, unknown>>;
    };
}, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: PlayerState, previousSelectedState: PlayerState) => void): () => void;
        <U>(selector: (state: PlayerState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: PlayerState | Partial<PlayerState> | ((state: import("immer").WritableDraft<PlayerState>) => void), shouldReplace?: false): unknown;
    setState(nextStateOrUpdater: PlayerState | ((state: import("immer").WritableDraft<PlayerState>) => void), shouldReplace: true): unknown;
} & {
    use: {
        addToQueueByType: () => (items: Song[], playType: Play, playSongId?: string, context?: MusicPlaybackContext) => void;
        addToQueueByUniqueId: () => (items: Song[], uniqueId: string, edge: "bottom" | "top", playSongId?: string) => void;
        clearQueue: () => () => void;
        clearSelected: () => (items: QueueSong[]) => void;
        decreaseVolume: () => (value: number) => void;
        increaseVolume: () => (value: number) => void;
        mediaAutoNext: () => () => PlayerData;
        mediaNext: () => () => void;
        mediaPause: () => () => void;
        mediaPlay: () => (id?: string) => void;
        mediaPlayByIndex: () => (index: number) => void;
        mediaPrevious: () => () => void;
        mediaSeekToTimestamp: () => (timestamp: number) => void;
        mediaSkipBackward: () => (offset?: number) => void;
        mediaSkipForward: () => (offset?: number) => void;
        mediaStop: () => (options?: {
            reset?: boolean;
        }) => void;
        mediaToggleMute: () => () => void;
        mediaTogglePlayPause: () => () => void;
        moveSelectedTo: () => (items: QueueSong[], uniqueId: string, edge: "bottom" | "top") => void;
        moveSelectedToBottom: () => (items: QueueSong[]) => void;
        moveSelectedToNext: () => (items: QueueSong[]) => void;
        moveSelectedToTop: () => (items: QueueSong[]) => void;
        setCrossfadeDuration: () => (duration: number) => void;
        setCrossfadeStyle: () => (style: CrossfadeStyle) => void;
        setMusicPlaybackContext: () => (context: MusicPlaybackContext) => void;
        setPauseOnNextSongEnd: () => (value: boolean) => void;
        setQueue: () => (data: Song[], index?: number, position?: number, context?: MusicPlaybackContext, autoPlay?: boolean) => void;
        setRepeat: () => (repeat: PlayerRepeat) => void;
        setShuffle: () => (shuffle: PlayerShuffle) => void;
        setSpeed: () => (speed: number) => void;
        setTransitionType: () => (transitionType: PlayerStyle) => void;
        setVolume: () => (volume: number) => void;
        shuffle: () => () => void;
        shuffleAll: () => () => void;
        shuffleSelected: () => (items: QueueSong[]) => void;
        toggleRepeat: () => () => void;
        toggleShuffle: () => () => void;
        hydrated: () => boolean;
        playbackSnapshot: () => PlayerData;
        player: () => PlayerTransportSlice;
        queue: () => QueueData;
    };
};
export declare const getCurrentSong: (state?: PlayerState) => QueueSong | undefined;
export declare const getPlayerData: (state?: PlayerState) => PlayerData;
export declare const getQueue: (groupBy?: QueueGroupingProperty, state?: PlayerState) => import("/@/renderer/store/player-derived").GroupedQueue;
export declare const getQueueOrder: (state?: PlayerState) => import("/@/renderer/store/player-derived").GroupedQueue;
export declare const isFirstTrackInQueue: (state?: PlayerState) => boolean;
export declare const isLastTrackInQueue: (state?: PlayerState) => boolean;
export declare const usePlayerActions: () => {
    getQueue: (groupBy?: QueueGroupingProperty) => import("/@/renderer/store/player-derived").GroupedQueue;
    isFirstTrackInQueue: () => boolean;
    isLastTrackInQueue: () => boolean;
    setTimestamp: (timestamp: number) => void;
    addToQueueByType: (items: Song[], playType: Play, playSongId?: string, context?: MusicPlaybackContext) => void;
    addToQueueByUniqueId: (items: Song[], uniqueId: string, edge: "bottom" | "top", playSongId?: string) => void;
    clearQueue: () => void;
    clearSelected: (items: QueueSong[]) => void;
    decreaseVolume: (value: number) => void;
    increaseVolume: (value: number) => void;
    mediaAutoNext: () => PlayerData;
    mediaNext: () => void;
    mediaPause: () => void;
    mediaPlay: (id?: string) => void;
    mediaPlayByIndex: (index: number) => void;
    mediaPrevious: () => void;
    mediaSeekToTimestamp: (timestamp: number) => void;
    mediaSkipBackward: (offset?: number) => void;
    mediaSkipForward: (offset?: number) => void;
    mediaStop: (options?: {
        reset?: boolean;
    }) => void;
    mediaToggleMute: () => void;
    mediaTogglePlayPause: () => void;
    moveSelectedTo: (items: QueueSong[], uniqueId: string, edge: "bottom" | "top") => void;
    moveSelectedToBottom: (items: QueueSong[]) => void;
    moveSelectedToNext: (items: QueueSong[]) => void;
    moveSelectedToTop: (items: QueueSong[]) => void;
    setCrossfadeDuration: (duration: number) => void;
    setCrossfadeStyle: (style: CrossfadeStyle) => void;
    setMusicPlaybackContext: (context: MusicPlaybackContext) => void;
    setPauseOnNextSongEnd: (value: boolean) => void;
    setQueue: (data: Song[], index?: number, position?: number, context?: MusicPlaybackContext, autoPlay?: boolean) => void;
    setRepeat: (repeat: PlayerRepeat) => void;
    setShuffle: (shuffle: PlayerShuffle) => void;
    setSpeed: (speed: number) => void;
    setTransitionType: (transitionType: PlayerStyle) => void;
    setVolume: (volume: number) => void;
    shuffle: () => void;
    shuffleAll: () => void;
    shuffleSelected: (items: QueueSong[]) => void;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
};
export type AddToQueueByPlayType = Play;
export type AddToQueueByUniqueId = {
    edge: 'bottom' | 'left' | 'right' | 'top' | null;
    uniqueId: string;
};
export type AddToQueueType = AddToQueueByPlayType | AddToQueueByUniqueId;
export declare function addToQueueByData(type: AddToQueueType, data: Song[]): Promise<void>;
export declare const subscribePlayerQueue: (onChange: (queue: QueueData, prevQueue: QueueData) => void) => () => void;
export declare const subscribeCurrentTrack: (onChange: (properties: {
    index: number;
    song: QueueSong | undefined;
}, prev: {
    index: number;
    song: QueueSong | undefined;
}) => void) => () => void;
export declare const subscribeNextSongInsertion: (onChange: (song: QueueSong | undefined) => void) => () => void;
export declare const subscribePlayerVolume: (onChange: (properties: {
    volume: number;
}, prev: {
    volume: number;
}) => void) => () => void;
export declare const subscribePlayerStatus: (onChange: (properties: {
    status: PlayerStatus;
}, prev: {
    status: PlayerStatus;
}) => void) => () => void;
/** @deprecated Use subscribePlayerSeek — seeks are event-bus driven (F8). */
export declare const subscribePlayerSeekToTimestamp: typeof subscribePlayerSeek;
export { subscribePlayerSeek } from '/@/renderer/store/player/seek';
export declare const subscribePlayerMute: (onChange: (properties: {
    muted: boolean;
}, prev: {
    muted: boolean;
}) => void) => () => void;
export declare const subscribePlayerSpeed: (onChange: (properties: {
    speed: number;
}, prev: {
    speed: number;
}) => void) => () => void;
export declare const subscribePlayerRepeat: (onChange: (properties: {
    repeat: PlayerRepeat;
}, prev: {
    repeat: PlayerRepeat;
}) => void) => () => void;
export declare const subscribePlayerShuffle: (onChange: (properties: {
    shuffle: PlayerShuffle;
}, prev: {
    shuffle: PlayerShuffle;
}) => void) => () => void;
export declare const subscribeQueueCleared: (onChange: () => void) => () => void;
export declare const usePlayerProperties: () => {
    crossfadeDuration: number;
    crossfadeStyle: CrossfadeStyle;
    isMuted: boolean;
    playerNum: 1 | 2;
    repeat: PlayerRepeat;
    shuffle: PlayerShuffle;
    speed: number;
    status: PlayerStatus;
    transitionType: PlayerStyle;
    volume: number;
};
/** Single subscription for components that read multiple transport fields (F12). */
export declare const usePlayerVolumeState: () => {
    muted: boolean;
    volume: number;
};
export declare const usePlayerPlaybackControlsState: () => {
    repeat: PlayerRepeat;
    shuffle: PlayerShuffle;
    status: PlayerStatus;
};
export declare const usePlayerMpvEngineState: () => {
    muted: boolean;
    speed: number;
    volume: number;
};
export declare const usePlayerDuration: () => number | undefined;
export declare const usePlayerData: () => PlayerData;
export declare const updateQueueFavorites: (ids: string[], favorite: boolean) => void;
export declare const updateQueueRatings: (ids: string[], rating: null | number) => void;
export declare const incrementQueuePlayCount: (ids: string[]) => void;
export declare const updateQueueSong: (songId: string, updatedSong: Song) => void;
export declare const usePlayerMuted: () => boolean;
export declare const usePlayerRepeat: () => PlayerRepeat;
export declare const usePlayerShuffle: () => PlayerShuffle;
export declare const usePlayerStatus: () => PlayerStatus;
export declare const usePlayerHydrated: () => boolean;
export declare const usePlayerVolume: () => number;
export declare const usePlayerSpeed: () => number;
export declare const usePlayerSong: () => QueueSong | undefined;
export declare const usePlayerSongProperties: <T extends keyof QueueSong>(properties: T[]) => Partial<Pick<QueueSong, T>>;
export declare const usePlayerNum: () => 1 | 2;
export declare const usePlayerQueue: () => QueueSong[];
export declare const usePlayerTransportSlice: () => {
    crossfadeDuration: number;
    crossfadeStyle: CrossfadeStyle;
    index: number;
    muted: boolean;
    pauseOnNextSongEnd: boolean;
    playerNum: 1 | 2;
    repeat: PlayerRepeat;
    shuffle: PlayerShuffle;
    speed: number;
    status: PlayerStatus;
    transitionType: PlayerStyle;
    volume: number;
};
export declare const usePlayerQueueSlice: () => {
    default: string[];
    revision: number | undefined;
    shuffled: number[];
    songs: Record<string, QueueSong>;
};

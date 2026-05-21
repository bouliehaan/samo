export declare enum Play {
    INDEX = "index",
    LAST = "last",
    LAST_SHUFFLE = "lastShuffle",
    NEXT = "next",
    NEXT_SHUFFLE = "nextShuffle",
    NOW = "now",
    SHUFFLE = "shuffle"
}
export declare enum PlayerQueueType {
    DEFAULT = "default",
    PRIORITY = "priority"
}
export declare enum PlayerRepeat {
    ALL = "all",
    NONE = "none",
    ONE = "one"
}
export declare enum PlayerShuffle {
    ALBUM = "album",
    NONE = "none",
    TRACK = "track"
}
export declare enum PlayerStatus {
    PAUSED = "paused",
    PLAYING = "playing"
}
export declare enum PlayerType {
    LOCAL = "local",
    WEB = "web"
}
export type PlaybackEngine = 'android-native' | 'mpv-native' | 'none' | 'web';
export interface PlaybackSession {
    engine: PlaybackEngine;
    id: string;
    mediaKey: null | string;
    source: null | PlaybackSource;
    startedAt: number;
    status: PlaybackSessionStatus;
}
export type PlaybackSessionStatus = 'active' | 'idle';
export type PlaybackSource = 'audiobook' | 'music' | 'podcast' | 'radio';
interface CreatePlaybackSessionOptions {
    engine: PlaybackEngine;
    mediaKey?: null | string;
    now?: number;
    sequence: number;
    source: PlaybackSource;
}
export declare const createIdlePlaybackSession: () => PlaybackSession;
export declare const createPlaybackSession: ({ engine, mediaKey, now, sequence, source, }: CreatePlaybackSessionOptions) => PlaybackSession;
export {};

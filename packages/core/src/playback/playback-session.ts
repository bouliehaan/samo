export enum Play {
    INDEX = 'index',
    LAST = 'last',
    LAST_SHUFFLE = 'lastShuffle',
    NEXT = 'next',
    NEXT_SHUFFLE = 'nextShuffle',
    NOW = 'now',
    SHUFFLE = 'shuffle',
}

export enum PlayerQueueType {
    DEFAULT = 'default',
    PRIORITY = 'priority',
}

export enum PlayerRepeat {
    ALL = 'all',
    NONE = 'none',
    ONE = 'one',
}

export enum PlayerShuffle {
    ALBUM = 'album',
    NONE = 'none',
    TRACK = 'track',
}

export enum PlayerStatus {
    PAUSED = 'paused',
    PLAYING = 'playing',
}

export enum PlayerType {
    LOCAL = 'local',
    WEB = 'web',
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

export const createIdlePlaybackSession = (): PlaybackSession => ({
    engine: 'none',
    id: 'idle',
    mediaKey: null,
    source: null,
    startedAt: 0,
    status: 'idle',
});

export const createPlaybackSession = ({
    engine,
    mediaKey = null,
    now = Date.now(),
    sequence,
    source,
}: CreatePlaybackSessionOptions): PlaybackSession => ({
    engine,
    id: `${source}-${now}-${sequence}`,
    mediaKey,
    source,
    startedAt: now,
    status: 'active',
});

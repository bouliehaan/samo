import type { RadioCurrentStationArt, RadioMetadata } from '/@/renderer/features/radio/hooks/use-radio-player';
import type { PlaybackSource } from '/@/renderer/store/playback-owner.store';
export type MusicPlaybackContext = {
    albumId: string;
    kind: 'album';
    serverId: string;
} | {
    kind: 'playlist';
    playlistId: string;
    serverId: string;
} | {
    kind: 'song';
};
interface BaseLastPlaybackSession {
    source: PlaybackSource;
    updatedAt: number;
}
export declare const SONG_CONTEXT: MusicPlaybackContext;
export declare const isStructuredMusicContext: (context: MusicPlaybackContext) => context is {
    albumId: string;
    kind: "album";
    serverId: string;
} | {
    kind: "playlist";
    playlistId: string;
    serverId: string;
};
export type LastPlaybackSession = LastAudiobookPlaybackSession | LastMusicPlaybackSession | LastPodcastPlaybackSession | LastRadioPlaybackSession;
interface LastAudiobookPlaybackSession extends BaseLastPlaybackSession {
    itemId: string;
    position?: number;
    serverId: string;
    source: 'audiobook';
}
interface LastMusicPlaybackSession extends BaseLastPlaybackSession {
    context: MusicPlaybackContext;
    /** Position in seconds at last save. Always present so the user resumes mid-track on relaunch. */
    position?: number;
    /**
     * The track currently in focus. For structured contexts this is a hint (the queue carries truth);
     * for `kind: 'song'` it is the only thing we restore — a one-track lifeboat queue.
     */
    songRef?: {
        serverId: string;
        songId: string;
    };
    source: 'music';
}
type LastPlaybackSessionInput = WithoutUpdatedAt<LastPlaybackSession>;
interface LastPlaybackSessionState {
    actions: {
        clear: () => void;
        setSession: (session: LastPlaybackSessionInput) => void;
    };
    session: LastPlaybackSession | null;
}
interface LastPodcastPlaybackSession extends BaseLastPlaybackSession {
    episodeId: string;
    itemId: string;
    position?: number;
    serverId: string;
    source: 'podcast';
}
interface LastRadioPlaybackSession extends BaseLastPlaybackSession {
    metadata?: null | RadioMetadata;
    serverId: string;
    source: 'radio';
    stationArt?: null | RadioCurrentStationArt;
    stationId: string;
    stationName?: null | string;
    streamUrl?: null | string;
}
type WithoutUpdatedAt<T> = T extends unknown ? Omit<T, 'updatedAt'> : never;
export declare const useLastPlaybackSessionStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<LastPlaybackSessionState>, "setState" | "persist"> & {
    setState(partial: LastPlaybackSessionState | Partial<LastPlaybackSessionState> | ((state: LastPlaybackSessionState) => LastPlaybackSessionState | Partial<LastPlaybackSessionState>), replace?: false | undefined): unknown;
    setState(state: LastPlaybackSessionState | ((state: LastPlaybackSessionState) => LastPlaybackSessionState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<LastPlaybackSessionState, {
            session: LastPlaybackSession | null;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: LastPlaybackSessionState) => void) => () => void;
        onFinishHydration: (fn: (state: LastPlaybackSessionState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<LastPlaybackSessionState, {
            session: LastPlaybackSession | null;
        }, unknown>>;
    };
}>;
export declare const rememberMusicPlaybackSession: (args?: {
    context?: MusicPlaybackContext;
    position?: number;
    songRef?: {
        serverId: string;
        songId: string;
    };
}) => void;
export {};

import type {
    RadioCurrentStationArt,
    RadioMetadata,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import type { PlaybackSource } from '/@/renderer/store/playback-owner.store';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
    identityPersistMigrate,
    PERSIST_VERSION_INITIAL,
} from '/@/renderer/store/persist-migrate';

export type MusicPlaybackContext =
    | { albumId: string; kind: 'album'; serverId: string }
    | { kind: 'playlist'; playlistId: string; serverId: string }
    | { kind: 'song' };

interface BaseLastPlaybackSession {
    source: PlaybackSource;
    updatedAt: number;
}

export const SONG_CONTEXT: MusicPlaybackContext = { kind: 'song' };

export const isStructuredMusicContext = (context: MusicPlaybackContext) =>
    context.kind === 'album' || context.kind === 'playlist';

export type LastPlaybackSession =
    | LastAudiobookPlaybackSession
    | LastMusicPlaybackSession
    | LastPodcastPlaybackSession
    | LastRadioPlaybackSession;

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
    songRef?: { serverId: string; songId: string };
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

export const useLastPlaybackSessionStore = create<LastPlaybackSessionState>()(
    persist(
        (set) => ({
            actions: {
                clear: () => set({ session: null }),
                setSession: (session) =>
                    set({
                        session: {
                            ...session,
                            updatedAt: Date.now(),
                        } as LastPlaybackSession,
                    }),
            },
            session: null,
        }),
        {
            merge: (persistedState, currentState) => ({
                ...currentState,
                session:
                    (persistedState as Partial<LastPlaybackSessionState> | undefined)?.session ??
                    currentState.session,
            }),
            migrate: identityPersistMigrate<Pick<LastPlaybackSessionState, 'session'>>,
            name: 'last-playback-session-store',
            partialize: (state) => ({ session: state.session }),
            version: PERSIST_VERSION_INITIAL,
        },
    ),
);

export const rememberMusicPlaybackSession = (
    args: {
        context?: MusicPlaybackContext;
        position?: number;
        songRef?: { serverId: string; songId: string };
    } = {},
) => {
    const previous = useLastPlaybackSessionStore.getState().session;
    const previousMusic = previous && previous.source === 'music' ? previous : undefined;

    useLastPlaybackSessionStore.getState().actions.setSession({
        context: args.context ?? previousMusic?.context ?? SONG_CONTEXT,
        position: args.position ?? previousMusic?.position,
        songRef: args.songRef ?? previousMusic?.songRef,
        source: 'music',
    });
};

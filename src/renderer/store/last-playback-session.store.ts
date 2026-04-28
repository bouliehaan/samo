import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
    RadioCurrentStationArt,
    RadioMetadata,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import type { PlaybackSource } from '/@/renderer/store/playback-owner.store';

interface BaseLastPlaybackSession {
    source: PlaybackSource;
    updatedAt: number;
}

interface LastMusicPlaybackSession extends BaseLastPlaybackSession {
    source: 'music';
}

interface LastAudiobookPlaybackSession extends BaseLastPlaybackSession {
    itemId: string;
    position?: number;
    serverId: string;
    source: 'audiobook';
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
    stationArt?: null | RadioCurrentStationArt;
    stationId: string;
    stationName?: null | string;
    streamUrl?: null | string;
    serverId: string;
    source: 'radio';
}

export type LastPlaybackSession =
    | LastAudiobookPlaybackSession
    | LastMusicPlaybackSession
    | LastPodcastPlaybackSession
    | LastRadioPlaybackSession;

type WithoutUpdatedAt<T> = T extends unknown ? Omit<T, 'updatedAt'> : never;
type LastPlaybackSessionInput = WithoutUpdatedAt<LastPlaybackSession>;

interface LastPlaybackSessionState {
    actions: {
        clear: () => void;
        setSession: (session: LastPlaybackSessionInput) => void;
    };
    session: LastPlaybackSession | null;
}

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
            name: 'last-playback-session-store',
            partialize: (state) => ({ session: state.session }),
        },
    ),
);

export const rememberMusicPlaybackSession = () => {
    useLastPlaybackSessionStore.getState().actions.setSession({ source: 'music' });
};

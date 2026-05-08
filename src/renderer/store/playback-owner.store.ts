import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type PlaybackEngine = 'mpv-native' | 'none' | 'web';
export interface PlaybackSession {
    engine: PlaybackEngine;
    id: string;
    source: null | PlaybackSource;
    startedAt: number;
    status: PlaybackSessionStatus;
}
export type PlaybackSessionStatus = 'active' | 'idle';

export type PlaybackSource = 'audiobook' | 'music' | 'podcast' | 'radio';

interface PlaybackClaimOptions {
    engine?: PlaybackEngine;
}

interface PlaybackOwnerState {
    claim: (source: PlaybackSource, options?: PlaybackClaimOptions) => PlaybackSession;
    release: (source: PlaybackSource) => void;
    session: PlaybackSession;
    source: null | PlaybackSource;
}

let playbackSessionSequence = 0;

const createIdlePlaybackSession = (): PlaybackSession => ({
    engine: 'none',
    id: 'idle',
    source: null,
    startedAt: 0,
    status: 'idle',
});

const createPlaybackSession = (
    source: PlaybackSource,
    engine: PlaybackEngine,
): PlaybackSession => ({
    engine,
    id: `${source}-${Date.now()}-${++playbackSessionSequence}`,
    source,
    startedAt: Date.now(),
    status: 'active',
});

export const usePlaybackOwnerStore = create<PlaybackOwnerState>()(
    subscribeWithSelector((set, get) => ({
        claim: (source, options = {}) => {
            const session = createPlaybackSession(source, options.engine ?? 'none');
            set({ session, source });
            return session;
        },
        release: (source) => {
            if (get().source === source) {
                set({ session: createIdlePlaybackSession(), source: null });
            }
        },
        session: createIdlePlaybackSession(),
        source: null,
    })),
);

export const usePlaybackSession = () => usePlaybackOwnerStore((state) => state.session);
export const usePlaybackSource = () => usePlaybackOwnerStore((state) => state.source);

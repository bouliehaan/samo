import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { stopAllAudioElements } from '/@/renderer/features/player/audio-player/audio-element-registry';

export type PlaybackEngine = 'mpv-native' | 'none' | 'web';
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

interface PlaybackClaimOptions {
    engine?: PlaybackEngine;
    mediaKey?: null | string;
    replace?: boolean;
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
    mediaKey: null,
    source: null,
    startedAt: 0,
    status: 'idle',
});

const createPlaybackSession = (
    source: PlaybackSource,
    engine: PlaybackEngine,
    mediaKey: null | string,
): PlaybackSession => ({
    engine,
    id: `${source}-${Date.now()}-${++playbackSessionSequence}`,
    mediaKey,
    source,
    startedAt: Date.now(),
    status: 'active',
});

export const usePlaybackOwnerStore = create<PlaybackOwnerState>()(
    subscribeWithSelector((set, get) => ({
        claim: (source, options = {}) => {
            const currentSession = get().session;
            const nextMediaKey = options.mediaKey ?? null;
            const isSourceChange = get().source !== source;
            const isExplicitReplacement = Boolean(options.replace);
            const isMediaKeyReplacement =
                options.mediaKey !== undefined &&
                currentSession.source === source &&
                currentSession.mediaKey !== null &&
                currentSession.mediaKey !== nextMediaKey;

            // Stop any Web audio that belongs to the outgoing owner/session.
            // Mounted elements stay registered so reused DOM nodes remain
            // inspectable and controllable after a URL or session switch.
            if (isSourceChange || isExplicitReplacement || isMediaKeyReplacement) {
                stopAllAudioElements();
            }
            const session = createPlaybackSession(source, options.engine ?? 'none', nextMediaKey);
            set({ session, source });
            return session;
        },
        release: (source) => {
            if (get().source === source) {
                stopAllAudioElements();
                set({ session: createIdlePlaybackSession(), source: null });
            }
        },
        session: createIdlePlaybackSession(),
        source: null,
    })),
);

export const usePlaybackSession = () => usePlaybackOwnerStore((state) => state.session);
export const usePlaybackSource = () => usePlaybackOwnerStore((state) => state.source);

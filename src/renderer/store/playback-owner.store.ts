import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type PlaybackSource = 'audiobook' | 'music' | 'podcast' | 'radio';

interface PlaybackOwnerState {
    claim: (source: PlaybackSource) => void;
    release: (source: PlaybackSource) => void;
    source: null | PlaybackSource;
}

export const usePlaybackOwnerStore = create<PlaybackOwnerState>()(
    subscribeWithSelector((set, get) => ({
        claim: (source) => set({ source }),
        release: (source) => {
            if (get().source === source) {
                set({ source: null });
            }
        },
        source: null,
    })),
);

export const usePlaybackSource = () => usePlaybackOwnerStore((state) => state.source);

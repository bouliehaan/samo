import { subscribeWithSelector } from 'zustand/middleware';
import { create } from 'zustand';

export type PlaybackSource = 'audiobook' | 'music' | 'podcast' | 'radio';

interface PlaybackOwnerState {
    source: PlaybackSource | null;
    claim: (source: PlaybackSource) => void;
    release: (source: PlaybackSource) => void;
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

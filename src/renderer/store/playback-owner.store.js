import { createIdlePlaybackSession, createPlaybackSession, } from '@samo/core/playback';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { stopAllAudioElements } from '/@/renderer/features/player/audio-player/audio-element-registry';
let playbackSessionSequence = 0;
export const usePlaybackOwnerStore = create()(subscribeWithSelector((set, get) => ({
    claim: (source, options = {}) => {
        const currentSession = get().session;
        const nextMediaKey = options.mediaKey ?? null;
        const isSourceChange = get().source !== source;
        const isExplicitReplacement = Boolean(options.replace);
        const isMediaKeyReplacement = options.mediaKey !== undefined &&
            currentSession.source === source &&
            currentSession.mediaKey !== null &&
            currentSession.mediaKey !== nextMediaKey;
        // Stop any Web audio that belongs to the outgoing owner/session.
        // Mounted elements stay registered so reused DOM nodes remain
        // inspectable and controllable after a URL or session switch.
        if (isSourceChange || isExplicitReplacement || isMediaKeyReplacement) {
            stopAllAudioElements();
        }
        const session = createPlaybackSession({
            engine: options.engine ?? 'none',
            mediaKey: nextMediaKey,
            sequence: ++playbackSessionSequence,
            source,
        });
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
})));
export const usePlaybackSession = () => usePlaybackOwnerStore((state) => state.session);
export const usePlaybackSource = () => usePlaybackOwnerStore((state) => state.source);

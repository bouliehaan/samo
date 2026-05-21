import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { identityPersistMigrate, PERSIST_VERSION_INITIAL, } from '/@/renderer/store/persist-migrate';
export const SONG_CONTEXT = { kind: 'song' };
export const isStructuredMusicContext = (context) => context.kind === 'album' || context.kind === 'playlist';
export const useLastPlaybackSessionStore = create()(persist((set) => ({
    actions: {
        clear: () => set({ session: null }),
        setSession: (session) => set({
            session: {
                ...session,
                updatedAt: Date.now(),
            },
        }),
    },
    session: null,
}), {
    merge: (persistedState, currentState) => ({
        ...currentState,
        session: persistedState?.session ??
            currentState.session,
    }),
    migrate: (identityPersistMigrate),
    name: 'last-playback-session-store',
    partialize: (state) => ({ session: state.session }),
    version: PERSIST_VERSION_INITIAL,
}));
export const rememberMusicPlaybackSession = (args = {}) => {
    const previous = useLastPlaybackSessionStore.getState().session;
    const previousMusic = previous && previous.source === 'music' ? previous : undefined;
    useLastPlaybackSessionStore.getState().actions.setSession({
        context: args.context ?? previousMusic?.context ?? SONG_CONTEXT,
        position: args.position ?? previousMusic?.position,
        songRef: args.songRef ?? previousMusic?.songRef,
        source: 'music',
    });
};

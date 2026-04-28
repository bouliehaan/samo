import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { usePlayerStoreBase } from '/@/renderer/store/player.store';
import { AudiobookshelfChapter, AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { toast } from '/@/shared/components/toast/toast';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

// How often (in seconds of drift) to flush position to the persisted resume map.
const POSITION_PERSIST_DEBOUNCE_S = 10;

interface AudiobookState {
    actions: {
        play: (
            server: ServerListItemWithCredential,
            item: AudiobookshelfLibraryItem,
        ) => Promise<void>;
        release: () => void;
        seekTo: (seconds: number) => void;
        setDuration: (seconds: number) => void;
        setError: (error: null | string) => void;
        setPosition: (seconds: number) => void;
    };
    chapters: AudiobookshelfChapter[];
    contentUrl: null | string;
    duration: number;
    error: null | string;
    isLoading: boolean;
    item: AudiobookshelfLibraryItem | null;
    position: number;
    // Persisted: last-known position (seconds) per library item ID.
    resumeByItemId: Record<string, number>;
    server: null | ServerListItemWithCredential;
    sessionId: null | string;
}

// Internal: tracks the last position value that was flushed to resumeByItemId.
let lastFlushedPosition = 0;

export const useAudiobookStore = create<AudiobookState>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                actions: {
                    play: async (server, item) => {
                        console.log('[audiobook.store] play() called', {
                            itemId: item.id,
                            title: item.media?.metadata?.title || item.name,
                        });

                        usePlaybackOwnerStore.getState().claim('audiobook');
                        console.log('[audiobook.store] arbiter claimed → source=audiobook');

                        set({
                            chapters: [],
                            contentUrl: null,
                            duration: 0,
                            error: null,
                            isLoading: true,
                            item,
                            position: 0,
                            server,
                            sessionId: null,
                        });

                        try {
                            const session = await audiobookshelfController.playItem(
                                server,
                                item.id,
                            );

                            console.log('[audiobook.store] session fetched', {
                                contentUrl: session.audioTracks?.[0]?.contentUrl,
                                currentTime: session.currentTime,
                                trackCount: session.audioTracks?.length,
                            });

                            const contentUrl = session.audioTracks?.[0]?.contentUrl;
                            const chapters = session.libraryItem?.media?.chapters ?? [];

                            if (!contentUrl) {
                                throw new Error('Audiobookshelf did not return an audio URL');
                            }

                            // Prefer local persisted position (most recent), fall back to server's
                            // currentTime, then start from beginning.
                            const localResume = get().resumeByItemId[item.id];
                            const serverResume = session.currentTime ?? 0;
                            const resumePosition =
                                localResume !== undefined ? localResume : serverResume;

                            lastFlushedPosition = resumePosition;

                            set({
                                chapters,
                                contentUrl,
                                isLoading: false,
                                position: resumePosition,
                                sessionId: session.id ?? null,
                            });

                            console.log('[audiobook.store] state set → calling mediaPlay()', {
                                resumePosition,
                            });
                            usePlayerStoreBase.getState().mediaPlay();
                            console.log('[audiobook.store] mediaPlay() called');
                        } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            console.error('[audiobook.store] play() failed', err);
                            toast.error({ message: `Audiobook playback failed: ${message}` });

                            set({
                                error: message,
                                isLoading: false,
                            });

                            usePlaybackOwnerStore.getState().release('audiobook');
                        }
                    },

                    release: () => {
                        // Save current position before clearing.
                        const { item, position } = get();
                        if (item) {
                            set((state) => ({
                                resumeByItemId: { ...state.resumeByItemId, [item.id]: position },
                            }));
                        }

                        usePlaybackOwnerStore.getState().release('audiobook');

                        set({
                            chapters: [],
                            contentUrl: null,
                            duration: 0,
                            error: null,
                            isLoading: false,
                            item: null,
                            position: 0,
                            server: null,
                            sessionId: null,
                        });

                        lastFlushedPosition = 0;
                    },

                    seekTo: (seconds) => {
                        set({ position: seconds });
                        lastFlushedPosition = seconds;

                        const { item } = get();
                        if (item) {
                            set((state) => ({
                                resumeByItemId: { ...state.resumeByItemId, [item.id]: seconds },
                            }));
                        }
                    },

                    setDuration: (seconds) => {
                        set({ duration: seconds });
                    },

                    setError: (error) => {
                        set({ error });
                    },

                    setPosition: (seconds) => {
                        set({ position: seconds });

                        // Flush to resumeByItemId only when position has drifted enough.
                        const drift = Math.abs(seconds - lastFlushedPosition);
                        if (drift >= POSITION_PERSIST_DEBOUNCE_S) {
                            const { item } = get();
                            if (item) {
                                set((state) => ({
                                    resumeByItemId: {
                                        ...state.resumeByItemId,
                                        [item.id]: seconds,
                                    },
                                }));
                                lastFlushedPosition = seconds;
                            }
                        }
                    },
                },
                chapters: [],
                contentUrl: null,
                duration: 0,
                error: null,
                isLoading: false,
                item: null,
                position: 0,
                resumeByItemId: {},
                server: null,
                sessionId: null,
            }),
            {
                name: 'audiobook-store',
                // Persist only the resume map — transient playback state is never saved.
                partialize: (state) => ({ resumeByItemId: state.resumeByItemId }),
            },
        ),
    ),
);

// When another source takes ownership, save position and clear transient audiobook state.
// Matches the same pattern used by useRadioStore.
usePlaybackOwnerStore.subscribe(
    (state) => state.source,
    (source) => {
        if (source !== 'audiobook') {
            const { item, position } = useAudiobookStore.getState();

            if (item) {
                useAudiobookStore.setState((state) => ({
                    resumeByItemId: { ...state.resumeByItemId, [item.id]: position },
                }));
            }

            useAudiobookStore.setState({
                contentUrl: null,
                duration: 0,
                error: null,
                isLoading: false,
                item: null,
                position: 0,
                server: null,
                sessionId: null,
            });

            lastFlushedPosition = 0;
        }
    },
);

// Convenience selectors for use in components.
export const useAudiobookContentUrl = () => useAudiobookStore((state) => state.contentUrl);
export const useAudiobookItem = () => useAudiobookStore((state) => state.item);
export const useAudiobookIsLoading = () => useAudiobookStore((state) => state.isLoading);
export const useAudiobookPosition = () => useAudiobookStore((state) => state.position);
export const useAudiobookDuration = () => useAudiobookStore((state) => state.duration);
export const useAudiobookChapters = () => useAudiobookStore((state) => state.chapters);
export const useAudiobookError = () => useAudiobookStore((state) => state.error);
export const useAudiobookServer = () => useAudiobookStore((state) => state.server);
export const useAudiobookActions = () => useAudiobookStore((state) => state.actions);

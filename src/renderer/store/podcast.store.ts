import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { useLastPlaybackSessionStore } from '/@/renderer/store/last-playback-session.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { usePlayerStoreBase } from '/@/renderer/store/player.store';
import {
    AudiobookshelfLibraryItem,
    AudiobookshelfPodcastEpisode,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { toast } from '/@/shared/components/toast/toast';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

// How often (in seconds of drift) to flush position to the persisted resume map.
const POSITION_PERSIST_DEBOUNCE_S = 10;

/**
 * Persisted resume position is keyed by `${itemId}::${episodeId}` so each
 * episode resumes independently within a podcast. (Audiobooks resume per item
 * because they're a single linear book; podcasts resume per episode.)
 */
const resumeKey = (itemId: string, episodeId: string) => `${itemId}::${episodeId}`;

const clampPosition = (seconds: number, duration: number) => {
    if (!Number.isFinite(seconds)) return 0;
    const floor = Math.max(0, seconds);
    return duration > 0 ? Math.min(floor, duration) : floor;
};

interface PodcastState {
    actions: {
        play: (
            server: ServerListItemWithCredential,
            item: AudiobookshelfLibraryItem,
            episode: AudiobookshelfPodcastEpisode,
        ) => Promise<void>;
        release: () => void;
        seekTo: (seconds: number) => void;
        setError: (error: null | string) => void;
        setPosition: (seconds: number) => void;
    };
    contentUrl: null | string;
    duration: number;
    episode: AudiobookshelfPodcastEpisode | null;
    error: null | string;
    isLoading: boolean;
    item: AudiobookshelfLibraryItem | null;
    position: number;
    // Persisted: last-known position (seconds) per `${itemId}::${episodeId}`.
    resumeByEpisodeKey: Record<string, number>;
    server: null | ServerListItemWithCredential;
    sessionId: null | string;
}

// Internal: tracks the last position value flushed to resumeByEpisodeKey.
let lastFlushedPosition = 0;

const rememberPodcastPlaybackSession = (
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
    episode: AudiobookshelfPodcastEpisode,
    position?: number,
) => {
    useLastPlaybackSessionStore.getState().actions.setSession({
        episodeId: episode.id,
        itemId: item.id,
        position,
        serverId: server.id,
        source: 'podcast',
    });
};

export const usePodcastStore = create<PodcastState>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                actions: {
                    play: async (server, item, episode) => {
                        usePlaybackOwnerStore.getState().claim('podcast');
                        rememberPodcastPlaybackSession(server, item, episode, 0);

                        // Episode duration is on the episode itself; seed it up-front so the
                        // playerbar shows the right length before /play resolves.
                        const seedDuration =
                            episode.duration ?? episode.audioFile?.duration ?? 0;

                        set({
                            contentUrl: null,
                            duration: seedDuration,
                            episode,
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
                                episode.id,
                            );

                            const contentUrl = session.audioTracks?.[0]?.contentUrl;
                            if (!contentUrl) {
                                throw new Error('Audiobookshelf did not return an audio URL');
                            }

                            // Local persisted resume wins (most recent), then server's
                            // currentTime, then 0.
                            const localResume =
                                get().resumeByEpisodeKey[resumeKey(item.id, episode.id)];
                            const serverResume = session.currentTime ?? 0;
                            const resumePosition =
                                localResume !== undefined ? localResume : serverResume;

                            // /play is authoritative for duration if it has it; otherwise
                            // keep what we seeded from the episode.
                            const playSessionEpisode = session.libraryItem?.media?.episodes?.find(
                                (e) => e.id === episode.id,
                            );
                            const duration =
                                playSessionEpisode?.duration ??
                                playSessionEpisode?.audioFile?.duration ??
                                seedDuration;
                            const clampedResumePosition = clampPosition(
                                resumePosition,
                                duration,
                            );

                            lastFlushedPosition = clampedResumePosition;

                            set({
                                contentUrl,
                                duration,
                                isLoading: false,
                                position: clampedResumePosition,
                                sessionId: session.id ?? null,
                            });
                            rememberPodcastPlaybackSession(
                                server,
                                item,
                                episode,
                                clampedResumePosition,
                            );

                            usePlayerStoreBase.getState().mediaPlay();
                        } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            toast.error({ message: `Podcast playback failed: ${message}` });

                            set({
                                error: message,
                                isLoading: false,
                            });

                            usePlaybackOwnerStore.getState().release('podcast');
                        }
                    },

                    release: () => {
                        // Save current position before clearing.
                        const { episode, item, position, server } = get();
                        if (item && episode) {
                            set((state) => ({
                                resumeByEpisodeKey: {
                                    ...state.resumeByEpisodeKey,
                                    [resumeKey(item.id, episode.id)]: position,
                                },
                            }));
                            if (server) {
                                rememberPodcastPlaybackSession(server, item, episode, position);
                            }
                        }

                        usePlaybackOwnerStore.getState().release('podcast');

                        set({
                            contentUrl: null,
                            duration: 0,
                            episode: null,
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
                        const nextPosition = clampPosition(seconds, get().duration);
                        set({ position: nextPosition });
                        lastFlushedPosition = nextPosition;

                        const { episode, item, server } = get();
                        if (item && episode) {
                            set((state) => ({
                                resumeByEpisodeKey: {
                                    ...state.resumeByEpisodeKey,
                                    [resumeKey(item.id, episode.id)]: nextPosition,
                                },
                            }));
                            if (server) {
                                rememberPodcastPlaybackSession(
                                    server,
                                    item,
                                    episode,
                                    nextPosition,
                                );
                            }
                        }
                    },

                    setError: (error) => {
                        set({ error });
                    },

                    setPosition: (seconds) => {
                        const nextPosition = clampPosition(seconds, get().duration);
                        set({ position: nextPosition });

                        const drift = Math.abs(nextPosition - lastFlushedPosition);
                        if (drift >= POSITION_PERSIST_DEBOUNCE_S) {
                            const { episode, item } = get();
                            if (item && episode) {
                                set((state) => ({
                                    resumeByEpisodeKey: {
                                        ...state.resumeByEpisodeKey,
                                        [resumeKey(item.id, episode.id)]: nextPosition,
                                    },
                                }));
                                lastFlushedPosition = nextPosition;
                                const { server } = get();
                                if (server) {
                                    rememberPodcastPlaybackSession(
                                        server,
                                        item,
                                        episode,
                                        nextPosition,
                                    );
                                }
                            }
                        }
                    },
                },
                contentUrl: null,
                duration: 0,
                episode: null,
                error: null,
                isLoading: false,
                item: null,
                position: 0,
                resumeByEpisodeKey: {},
                server: null,
                sessionId: null,
            }),
            {
                name: 'podcast-store',
                // Persist only the resume map — transient playback state is never saved.
                partialize: (state) => ({ resumeByEpisodeKey: state.resumeByEpisodeKey }),
            },
        ),
    ),
);

// When another source claims, save position and clear transient podcast state.
// Mirrors the same pattern used by useRadioStore and useAudiobookStore.
usePlaybackOwnerStore.subscribe(
    (state) => state.source,
    (source) => {
        if (source !== 'podcast') {
            const { episode, item, position } = usePodcastStore.getState();

            if (item && episode) {
                usePodcastStore.setState((state) => ({
                    resumeByEpisodeKey: {
                        ...state.resumeByEpisodeKey,
                        [resumeKey(item.id, episode.id)]: position,
                    },
                }));
            }

            usePodcastStore.setState({
                contentUrl: null,
                duration: 0,
                episode: null,
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

export const usePodcastContentUrl = () => usePodcastStore((state) => state.contentUrl);
export const usePodcastItem = () => usePodcastStore((state) => state.item);
export const usePodcastEpisode = () => usePodcastStore((state) => state.episode);
export const usePodcastIsLoading = () => usePodcastStore((state) => state.isLoading);
export const usePodcastPosition = () => usePodcastStore((state) => state.position);
export const usePodcastDuration = () => usePodcastStore((state) => state.duration);
export const usePodcastError = () => usePodcastStore((state) => state.error);
export const usePodcastServer = () => usePodcastStore((state) => state.server);
export const usePodcastActions = () => usePodcastStore((state) => state.actions);

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { useLastPlaybackSessionStore } from '/@/renderer/store/last-playback-session.store';
import { recordRecentAudiobook } from '/@/renderer/store/play-history.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { subscribePlayerStatus, usePlayerStoreBase } from '/@/renderer/store/player.store';
import {
    AudiobookshelfChapter,
    AudiobookshelfLibraryItem,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { toast } from '/@/shared/components/toast/toast';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';
import {
    clampPosition,
    normalizeResumePosition,
} from '/@/renderer/store/audiobook-resume-math';

// How often (in seconds of drift) to flush position to the persisted resume map.
const POSITION_PERSIST_DEBOUNCE_S = 10;
const SERVER_PROGRESS_SYNC_INTERVAL_S = 30;

import { getCurrentChapterIndex } from '/@/renderer/store/audiobook-chapters';

export type { AudiobookChapterListItem } from '/@/renderer/store/audiobook-chapters';
export {
    getCurrentChapterIndex,
    getOrderedAudiobookChapters,
} from '/@/renderer/store/audiobook-chapters';

interface AudiobookState {
    actions: {
        play: (
            server: ServerListItemWithCredential,
            item: AudiobookshelfLibraryItem,
        ) => Promise<void>;
        release: () => void;
        seekTo: (seconds: number) => void;
        seekToNextChapter: () => void;
        seekToPreviousChapter: () => void;
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
let lastServerSyncedPosition = 0;
let lastServerSyncAtMs = 0;
let hasLoggedMissingSessionId = false;
let playRequestId = 0;

const rememberAudiobookPlaybackSession = (
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
    position?: number,
) => {
    useLastPlaybackSessionStore.getState().actions.setSession({
        itemId: item.id,
        position,
        serverId: server.id,
        source: 'audiobook',
    });
};

const resetAudiobookshelfProgressSync = (position: number) => {
    lastServerSyncedPosition = position;
    lastServerSyncAtMs = Date.now();
};

const syncAudiobookshelfProgress = (options: {
    closeSession?: boolean;
    countListeningTime?: boolean;
    force?: boolean;
    reason: 'close' | 'pause' | 'progress' | 'seek';
}) => {
    const { duration, item, position, server, sessionId } = useAudiobookStore.getState();

    if (!item || !server) return;
    if (!sessionId) {
        if (!hasLoggedMissingSessionId) {
            console.warn('[audiobook.store] Audiobookshelf progress sync unavailable', {
                itemId: item.id,
                reason: 'missing-session-id',
                trigger: options.reason,
            });
            hasLoggedMissingSessionId = true;
        }
        return;
    }

    const currentTime = clampPosition(position, duration);
    const drift = Math.abs(currentTime - lastServerSyncedPosition);
    if (!options.force && !options.closeSession && drift < SERVER_PROGRESS_SYNC_INTERVAL_S) {
        return;
    }

    const now = Date.now();
    const timeListened =
        options.countListeningTime && lastServerSyncAtMs > 0
            ? Math.max(0, (now - lastServerSyncAtMs) / 1000)
            : 0;

    resetAudiobookshelfProgressSync(currentTime);

    const payload = {
        currentTime,
        duration: Math.max(0, duration),
        timeListened,
    };

    const request = options.closeSession
        ? audiobookshelfController.closePlaybackSession(server, sessionId, payload)
        : audiobookshelfController.syncPlaybackSession(server, sessionId, payload);

    void request.catch((error) => {
        console.warn('[audiobook.store] Audiobookshelf progress sync failed', {
            closeSession: options.closeSession,
            error,
            itemId: item.id,
            reason: options.reason,
            sessionId,
        });
    });
};

export const useAudiobookStore = create<AudiobookState>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                actions: {
                    play: async (server, item) => {
                        const requestId = ++playRequestId;

                        const current = get();
                        const currentItem = current.item;
                        if (currentItem) {
                            set((state) => ({
                                resumeByItemId: {
                                    ...state.resumeByItemId,
                                    [currentItem.id]: current.position,
                                },
                            }));
                            if (current.server) {
                                rememberAudiobookPlaybackSession(
                                    current.server,
                                    currentItem,
                                    current.position,
                                );
                            }
                            syncAudiobookshelfProgress({
                                closeSession: true,
                                countListeningTime:
                                    usePlayerStoreBase.getState().player.status ===
                                    PlayerStatus.PLAYING,
                                force: true,
                                reason: 'close',
                            });
                        }

                        usePlaybackOwnerStore.getState().claim('audiobook', { engine: 'web' });
                        rememberAudiobookPlaybackSession(server, item, 0);
                        recordRecentAudiobook(item, server.id);

                        // Seed chapters/duration from the library item up-front so the
                        // playerbar can render immediately without waiting on /play.
                        set({
                            chapters: item.media?.chapters ?? [],
                            contentUrl: null,
                            duration: item.media?.duration ?? 0,
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

                            if (requestId !== playRequestId) {
                                return;
                            }

                            const contentUrl = session.audioTracks?.[0]?.contentUrl;
                            // Prefer the playback session's media (it's authoritative for the
                            // current playback) and fall back to the library item we already had.
                            const chapters =
                                session.libraryItem?.media?.chapters ?? item.media?.chapters ?? [];
                            const duration =
                                session.libraryItem?.media?.duration ?? item.media?.duration ?? 0;

                            if (!contentUrl) {
                                throw new Error('Audiobookshelf did not return an audio URL');
                            }

                            // Prefer local persisted position (most recent), fall back to server's
                            // currentTime, then start from beginning.
                            const localResume = get().resumeByItemId[item.id];
                            const serverResume = session.currentTime ?? 0;
                            const resumePosition =
                                localResume !== undefined ? localResume : serverResume;
                            const clampedResumePosition = normalizeResumePosition(
                                resumePosition,
                                duration,
                            );

                            lastFlushedPosition = clampedResumePosition;
                            resetAudiobookshelfProgressSync(clampedResumePosition);
                            hasLoggedMissingSessionId = false;

                            set({
                                chapters,
                                contentUrl,
                                duration,
                                isLoading: false,
                                position: clampedResumePosition,
                                sessionId: session.id ?? null,
                            });
                            rememberAudiobookPlaybackSession(server, item, clampedResumePosition);

                            usePlayerStoreBase.getState().mediaPlay();
                        } catch (err) {
                            if (requestId !== playRequestId) {
                                return;
                            }
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
                        playRequestId += 1;
                        // Save current position before clearing.
                        const { item, position, server } = get();
                        if (item) {
                            set((state) => ({
                                resumeByItemId: { ...state.resumeByItemId, [item.id]: position },
                            }));
                            if (server) {
                                rememberAudiobookPlaybackSession(server, item, position);
                            }
                        }

                        syncAudiobookshelfProgress({
                            closeSession: true,
                            countListeningTime:
                                usePlayerStoreBase.getState().player.status ===
                                PlayerStatus.PLAYING,
                            force: true,
                            reason: 'close',
                        });

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
                        resetAudiobookshelfProgressSync(0);
                        hasLoggedMissingSessionId = false;
                        usePlaybackOwnerStore.getState().release('audiobook');
                    },

                    seekTo: (seconds) => {
                        const nextPosition = clampPosition(seconds, get().duration);
                        set({ position: nextPosition });
                        lastFlushedPosition = nextPosition;

                        const { item, server } = get();
                        if (item) {
                            set((state) => ({
                                resumeByItemId: {
                                    ...state.resumeByItemId,
                                    [item.id]: nextPosition,
                                },
                            }));
                            if (server) {
                                rememberAudiobookPlaybackSession(server, item, nextPosition);
                            }
                        }

                        syncAudiobookshelfProgress({
                            countListeningTime:
                                usePlayerStoreBase.getState().player.status ===
                                PlayerStatus.PLAYING,
                            force: true,
                            reason: 'seek',
                        });
                    },

                    seekToNextChapter: () => {
                        const { chapters, duration, position } = get();
                        const currentIndex = getCurrentChapterIndex(chapters, position, duration);
                        if (currentIndex === -1) return;
                        const nextIndex = currentIndex + 1;
                        if (nextIndex >= chapters.length) return; // already in last chapter
                        const target = Math.max(0, chapters[nextIndex].start);
                        usePlayerStoreBase.getState().mediaSeekToTimestamp(target);
                    },

                    seekToPreviousChapter: () => {
                        const { chapters, duration, position } = get();
                        const currentIndex = getCurrentChapterIndex(chapters, position, duration);
                        if (currentIndex === -1) return;
                        const currentStart = chapters[currentIndex].start;
                        // >5s into chapter → restart current; otherwise go to previous chapter
                        // (or 0 if already in the first chapter).
                        let target: number;
                        if (position - currentStart > 5) {
                            target = currentStart;
                        } else if (currentIndex > 0) {
                            target = chapters[currentIndex - 1].start;
                        } else {
                            target = 0;
                        }
                        usePlayerStoreBase.getState().mediaSeekToTimestamp(Math.max(0, target));
                    },

                    setDuration: (seconds) => {
                        set({ duration: seconds });
                    },

                    setError: (error) => {
                        set({ error });
                    },

                    setPosition: (seconds) => {
                        const nextPosition = clampPosition(seconds, get().duration);
                        set({ position: nextPosition });

                        // Flush to resumeByItemId only when position has drifted enough.
                        const drift = Math.abs(nextPosition - lastFlushedPosition);
                        if (drift >= POSITION_PERSIST_DEBOUNCE_S) {
                            const { item } = get();
                            if (item) {
                                set((state) => ({
                                    resumeByItemId: {
                                        ...state.resumeByItemId,
                                        [item.id]: nextPosition,
                                    },
                                }));
                                lastFlushedPosition = nextPosition;
                                const { server } = get();
                                if (server) {
                                    rememberAudiobookPlaybackSession(server, item, nextPosition);
                                }
                            }
                        }

                        syncAudiobookshelfProgress({
                            countListeningTime: true,
                            reason: 'progress',
                        });
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
                syncAudiobookshelfProgress({
                    closeSession: true,
                    countListeningTime:
                        usePlayerStoreBase.getState().player.status === PlayerStatus.PLAYING,
                    force: true,
                    reason: 'close',
                });
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
            resetAudiobookshelfProgressSync(0);
            hasLoggedMissingSessionId = false;
        }
    },
);

subscribePlayerStatus(({ status }, prev) => {
    if (
        prev.status === PlayerStatus.PLAYING &&
        status === PlayerStatus.PAUSED &&
        usePlaybackOwnerStore.getState().source === 'audiobook'
    ) {
        syncAudiobookshelfProgress({
            countListeningTime: true,
            force: true,
            reason: 'pause',
        });
    }
});

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

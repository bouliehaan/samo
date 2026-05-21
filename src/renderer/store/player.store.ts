import isElectron from 'is-electron';
import merge from 'lodash/merge';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';

import { createSubscribedTraditionalStore } from '/@/renderer/lib/zustand-traditional';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { emitPlayerSeek, subscribePlayerSeek } from '/@/renderer/store/player/seek';
import {
    createInitialPlayerTransportSlice,
    type PlayerTransportSlice,
} from '/@/renderer/store/player/slices';
import { createSelectors } from '/@/renderer/lib/zustand';
import {
    isStructuredMusicContext,
    type MusicPlaybackContext,
    rememberMusicPlaybackSession,
    SONG_CONTEXT,
} from '/@/renderer/store/last-playback-session.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { useSettingsStore } from '/@/renderer/store/settings.store';
import {
    setTimestamp as setTimestampStore,
    useTimestampStoreBase,
} from '/@/renderer/store/timestamp.store';
import {
    migratePlayerStorePersist,
    playerStoreStorage,
    setPlayerStoreHydratedForPersistence,
} from '/@/renderer/store/utils';
import {
    applyAddToQueueLast,
    applyAddToQueueLastShuffle,
    applyAddToQueueNext,
    applyAddToQueueNextShuffle,
    applyAddToQueueNow,
    applyAddToQueueShuffle,
    registerQueueSongs,
} from '/@/renderer/store/player-queue-actions';
import {
    addIndexesToShuffled,
    calculateNextIndex,
    calculateNextSong,
    findShuffledPositionForQueueIndex,
    generateShuffledIndexes,
    isShuffleEnabled,
    mapShuffledToQueueIndex,
    regenerateShuffledIndexesIfNeeded,
} from '/@/renderer/store/player-queue-math';
import {
    computePlayerData,
    getCurrentSongFromState,
    getPlayerDataFromState,
    getPlaybackInputs,
    getQueueFromState,
    getQueueOrderFromState,
    isFirstTrackInQueueFromState,
    isLastTrackInQueueFromState,
    playbackInputsEqual,
    QueueGroupingProperty,
    touchQueueRevision,
} from '/@/renderer/store/player-derived';
export type { GroupedQueue, QueueGroupingProperty } from '/@/renderer/store/player-derived';
import { shuffleInPlace } from '/@/renderer/utils/shuffle';
export {
    calculateNextSong,
    isShuffleEnabled,
    mapShuffledToQueueIndex,
} from '/@/renderer/store/player-queue-math';
import { PlayerData, QueueData, QueueSong, Song } from '/@/shared/types/domain-types';
import {
    CrossfadeStyle,
    Play,
    PlayerRepeat,
    PlayerShuffle,
    PlayerStatus,
    PlayerStyle,
    PlayerType,
} from '/@/shared/types/types';

export interface PlayerState extends Actions, PlayerDataState {}

interface Actions {
    addToQueueByType: (
        items: Song[],
        playType: Play,
        playSongId?: string,
        /**
         * Optional context describing the source (album/playlist) the user invoked.
         * Only consulted for fresh-start play types (`Play.NOW`, `Play.SHUFFLE`); additive
         * play types (LAST, NEXT, etc.) preserve the current context. When fresh-start
         * fires without an explicit context the player resets to `SONG_CONTEXT` — this is
         * what keeps an old album context from bleeding into an unrelated single-track play.
         */
        context?: MusicPlaybackContext,
    ) => void;
    addToQueueByUniqueId: (
        items: Song[],
        uniqueId: string,
        edge: 'bottom' | 'top',
        playSongId?: string,
    ) => void;
    clearQueue: () => void;
    clearSelected: (items: QueueSong[]) => void;
    decreaseVolume: (value: number) => void;
    increaseVolume: (value: number) => void;
    mediaAutoNext: () => PlayerData;
    mediaNext: () => void;
    mediaPause: () => void;
    mediaPlay: (id?: string) => void;
    mediaPlayByIndex: (index: number) => void;
    mediaPrevious: () => void;
    mediaSeekToTimestamp: (timestamp: number) => void;
    mediaSkipBackward: (offset?: number) => void;
    mediaSkipForward: (offset?: number) => void;
    /**
     * @param options.reset - When true (default), emits PLAYER_SEEK(0) so the engine seeks to start.
     * Timestamp display is always cleared to 0. Use false when the engine is already idle (e.g. mpv `stopped`) to skip that seek.
     */
    mediaStop: (options?: { reset?: boolean }) => void;
    mediaToggleMute: () => void;
    mediaTogglePlayPause: () => void;
    moveSelectedTo: (items: QueueSong[], uniqueId: string, edge: 'bottom' | 'top') => void;
    moveSelectedToBottom: (items: QueueSong[]) => void;
    moveSelectedToNext: (items: QueueSong[]) => void;
    moveSelectedToTop: (items: QueueSong[]) => void;
    setCrossfadeDuration: (duration: number) => void;
    setCrossfadeStyle: (style: CrossfadeStyle) => void;
    setMusicPlaybackContext: (context: MusicPlaybackContext) => void;
    setPauseOnNextSongEnd: (value: boolean) => void;
    setQueue: (
        data: Song[],
        index?: number,
        position?: number,
        /** Defaults to `SONG_CONTEXT` — `setQueue` is always a fresh start. */
        context?: MusicPlaybackContext,
        /**
         * When false, the queue is seeded paused — used by launch-time session restore
         * (one-track lifeboat) so the user can press play to resume rather than having
         * audio start unprompted. Defaults to true (user-initiated playback).
         */
        autoPlay?: boolean,
    ) => void;
    setRepeat: (repeat: PlayerRepeat) => void;
    setShuffle: (shuffle: PlayerShuffle) => void;
    setSpeed: (speed: number) => void;
    setTransitionType: (transitionType: PlayerStyle) => void;
    setVolume: (volume: number) => void;
    shuffle: () => void;
    shuffleAll: () => void;
    shuffleSelected: (items: QueueSong[]) => void;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
}

interface PlayerDataState {
    hydrated: boolean;
    playbackSnapshot: PlayerData;
    /** Transport slice (F8): status, volume, index, repeat, shuffle — not queue contents. */
    player: PlayerTransportSlice;
    /** Queue slice (F8): song map, order, shuffle mapping. */
    queue: QueueData;
}

function emitPlayerPlayEvent(
    targetSongUniqueId: string | undefined,
    set: (fn: (state: PlayerState) => void) => void,
    get: () => PlayerState,
): void {
    // If playSongId is provided, find the song and start playback on it
    if (targetSongUniqueId) {
        let playIndex: number | undefined;
        set((state) => {
            const queue = getQueueFromState(state);
            const queueIndex = queue.items.findIndex(
                (item) => item._uniqueId === targetSongUniqueId,
            );

            if (queueIndex !== -1) {
                if (
                    state.player.shuffle === PlayerShuffle.TRACK &&
                    state.queue.shuffled.length > 0
                ) {
                    // Find the shuffled position for this queue index
                    const shuffledPosition = state.queue.shuffled.findIndex(
                        (idx) => idx === queueIndex,
                    );
                    if (shuffledPosition !== -1) {
                        state.player.index = shuffledPosition;
                        playIndex = shuffledPosition;
                    } else {
                        state.player.index = queueIndex;
                        playIndex = queueIndex;
                    }
                } else {
                    state.player.index = queueIndex;
                    playIndex = queueIndex;
                }
                state.player.status = PlayerStatus.PLAYING;
                setTimestampStore(0);
            }
        });

        // Emit PLAYER_PLAY event if playback was started
        if (playIndex !== undefined) {
            eventEmitter.emit('PLAYER_PLAY', {
                id: targetSongUniqueId,
                index: playIndex,
            });
        }
    } else {
        // Otherwise, emit PLAYER_PLAY event for current song if available
        const currentState = get();
        const queue = getQueueFromState(currentState);
        const currentIndex = currentState.player.index;
        const currentSong = queue.items[currentIndex];

        if (currentSong && currentIndex !== undefined && currentIndex >= 0) {
            eventEmitter.emit('PLAYER_PLAY', {
                id: currentSong._uniqueId,
                index: currentIndex,
            });
        }
    }
}

const initialPlayerSlice = createInitialPlayerTransportSlice();

const initialQueue: QueueData = {
    default: [],
    revision: 0,
    shuffled: [],
    songs: {},
};

const initialState: PlayerDataState = {
    hydrated: false,
    playbackSnapshot: computePlayerData({
        player: initialPlayerSlice,
        queue: initialQueue,
    }),
    player: initialPlayerSlice,
    queue: initialQueue,
};

const claimMusicPlayback = () => {
    const playbackType = useSettingsStore.getState().playback.type;
    usePlaybackOwnerStore.getState().claim('music', {
        engine: isElectron() && playbackType === PlayerType.LOCAL ? 'mpv-native' : 'web',
    });
};

export const usePlayerStoreBase = createSubscribedTraditionalStore<PlayerState>()(
    persist(
        immer((set, get) => ({
                addToQueueByType: (items, playType, playSongId, context) => {
                    claimMusicPlayback();

                    // Fresh-start play types replace the listening intent. Default to
                    // `SONG_CONTEXT` so an old album/playlist context can't bleed into a
                    // single-track play; structured callers (album/playlist headers) pass
                    // their own context. Additive play types (LAST, NEXT, SHUFFLE variants
                    // for inserts) intentionally fall through and preserve the current
                    // context — adding "Play next" to an album doesn't end the album.
                    const isFreshStart = playType === Play.NOW || playType === Play.SHUFFLE;
                    if (isFreshStart) {
                        const nextContext = context ?? SONG_CONTEXT;
                        set((state) => {
                            state.player.context = nextContext;
                        });
                        rememberMusicPlaybackSession({ context: nextContext });
                    }

                    const newItems = items.map(toQueueSong);
                    const newUniqueIds = newItems.map((item) => item._uniqueId);

                    // Find the target song's uniqueId if playSongId is provided
                    const targetSongUniqueId = playSongId
                        ? newItems.find((item) => item.id === playSongId)?._uniqueId
                        : undefined;

                    switch (playType) {
                        case Play.LAST: {
                            set((state) => {
                                registerQueueSongs(state, newItems);
                                applyAddToQueueLast(state, newUniqueIds);
                            });
                            break;
                        }
                        case Play.LAST_SHUFFLE: {
                            set((state) => {
                                registerQueueSongs(state, newItems);
                                applyAddToQueueLastShuffle(
                                    state,
                                    shuffleInPlace([...newUniqueIds]),
                                );
                            });
                            break;
                        }
                        case Play.NEXT: {
                            set((state) => {
                                registerQueueSongs(state, newItems);
                                applyAddToQueueNext(state, newUniqueIds);
                            });
                            break;
                        }
                        case Play.NEXT_SHUFFLE: {
                            set((state) => {
                                registerQueueSongs(state, newItems);
                                applyAddToQueueNextShuffle(state, shuffleInPlace([...newUniqueIds]));
                            });
                            break;
                        }
                        case Play.NOW: {
                            set((state) => {
                                registerQueueSongs(state, newItems);
                                state.player.status = PlayerStatus.PLAYING;
                                state.player.playerNum = 1;
                                setTimestampStore(0);
                                applyAddToQueueNow(state, newUniqueIds, targetSongUniqueId);
                            });

                            emitPlayerPlayEvent(targetSongUniqueId, set, get);
                            break;
                        }
                        case Play.SHUFFLE: {
                            set((state) => {
                                registerQueueSongs(state, newItems);
                                state.player.status = PlayerStatus.PLAYING;
                                state.player.playerNum = 1;
                                setTimestampStore(0);
                                applyAddToQueueShuffle(state, shuffleInPlace([...newUniqueIds]));
                            });

                            emitPlayerPlayEvent(targetSongUniqueId, set, get);
                            break;
                        }
                    }
                },
                addToQueueByUniqueId: (items, uniqueId, edge, playSongId) => {
                    const newItems = items.map(toQueueSong);
                    const newUniqueIds = newItems.map((item) => item._uniqueId);

                    // Find the target song's uniqueId if playSongId is provided
                    const targetSongUniqueId = playSongId
                        ? newItems.find((item) => item.id === playSongId)?._uniqueId
                        : undefined;

                    set((state) => {
                        // Add new songs to songs object
                        newItems.forEach((item) => {
                            state.queue.songs[item._uniqueId] = item;
                        });

                        const index = state.queue.default.findIndex((id) => id === uniqueId);

                        const insertIndex = Math.max(0, edge === 'top' ? index : index + 1);

                        const newQueue = [
                            ...state.queue.default.slice(0, insertIndex),
                            ...newUniqueIds,
                            ...state.queue.default.slice(insertIndex),
                        ];

                        state.queue.default = newQueue;

                        if (state.player.shuffle === PlayerShuffle.TRACK) {
                            const currentTrack = getCurrentSongFromState(state);
                            const currentTrackUniqueId = currentTrack?._uniqueId;

                            if (currentTrackUniqueId) {
                                // Adjust existing shuffled indexes that are >= insertIndex
                                const adjustedShuffled = state.queue.shuffled.map((idx) => {
                                    if (idx >= insertIndex) {
                                        return idx + newUniqueIds.length;
                                    }
                                    return idx;
                                });

                                // New items will be at indexes starting from insertIndex
                                const newIndexes = Array.from(
                                    { length: newUniqueIds.length },
                                    (_, i) => insertIndex + i,
                                );

                                const currentShuffledIndex = state.player.index;
                                state.queue.shuffled = addIndexesToShuffled(
                                    adjustedShuffled,
                                    currentShuffledIndex,
                                    newIndexes,
                                );

                                // Recalculate player index to the shuffled position
                                const queueIndex = newQueue.findIndex(
                                    (id) => id === currentTrackUniqueId,
                                );
                                if (queueIndex !== -1) {
                                    const shuffledPosition = state.queue.shuffled.findIndex(
                                        (idx) => idx === queueIndex,
                                    );
                                    if (shuffledPosition !== -1) {
                                        state.player.index = shuffledPosition;
                                    }
                                }
                            } else {
                                // No current track, regenerate shuffled indexes
                                state.queue.shuffled = generateShuffledIndexes(newQueue.length);
                            }
                        } else {
                            // Recalculate the player index if we're inserting items above the current index
                            if (insertIndex <= state.player.index) {
                                state.player.index = state.player.index + newUniqueIds.length;
                            }

                            recalculatePlayerIndex(state, newQueue);
                        }
                    });

                    // If playSongId is provided, find the song and start playback on it
                    if (targetSongUniqueId) {
                        let playIndex: number | undefined;
                        set((state) => {
                            const queue = getQueueFromState(state);
                            const queueIndex = queue.items.findIndex(
                                (item) => item._uniqueId === targetSongUniqueId,
                            );

                            if (queueIndex !== -1) {
                                if (
                                    state.player.shuffle === PlayerShuffle.TRACK &&
                                    state.queue.shuffled.length > 0
                                ) {
                                    // Find the shuffled position for this queue index
                                    const shuffledPosition = state.queue.shuffled.findIndex(
                                        (idx) => idx === queueIndex,
                                    );
                                    if (shuffledPosition !== -1) {
                                        state.player.index = shuffledPosition;
                                        playIndex = shuffledPosition;
                                    } else {
                                        state.player.index = queueIndex;
                                        playIndex = queueIndex;
                                    }
                                } else {
                                    state.player.index = queueIndex;
                                    playIndex = queueIndex;
                                }
                                state.player.status = PlayerStatus.PLAYING;
                                setTimestampStore(0);
                            }
                        });

                        // Emit PLAYER_PLAY event if playback was started
                        if (playIndex !== undefined) {
                            eventEmitter.emit('PLAYER_PLAY', {
                                id: targetSongUniqueId,
                                index: playIndex,
                            });
                        }
                    }
                },
                clearQueue: () => {
                    set((state) => {
                        state.player.index = -1;
                        state.queue.default = [];
                        state.queue.shuffled = [];
                        state.queue.songs = {};
                    });
                },
                clearSelected: (items: QueueSong[]) => {
                    set((state) => {
                        const uniqueIds = new Set(items.map((item) => item._uniqueId));

                        const indexesToRemove = new Set<number>();

                        state.queue.default.forEach((id, index) => {
                            if (uniqueIds.has(id)) {
                                indexesToRemove.add(index);
                            }
                        });

                        state.queue.default = state.queue.default.filter(
                            (id) => !uniqueIds.has(id),
                        );

                        if (isShuffleEnabled(state)) {
                            // Remove indexes from shuffled array and adjust remaining indexes
                            const newShuffled = state.queue.shuffled
                                .filter((idx) => !indexesToRemove.has(idx))
                                .map((idx) => {
                                    // Count how many removed indexes are before this index
                                    let adjustment = 0;
                                    for (const removedIdx of indexesToRemove) {
                                        if (removedIdx < idx) {
                                            adjustment++;
                                        }
                                    }
                                    return idx - adjustment;
                                });
                            state.queue.shuffled = newShuffled;
                        } else {
                            state.queue.shuffled = [];
                        }

                        cleanupOrphanedSongs(state);

                        recalculatePlayerIndex(state, state.queue.default);
                    });
                },
                decreaseVolume: (value: number) => {
                    set((state) => {
                        state.player.volume = Math.max(0, state.player.volume - value);
                    });
                },
                increaseVolume: (value: number) => {
                    set((state) => {
                        state.player.volume = Math.min(100, state.player.volume + value);
                    });
                },
                mediaAutoNext: () => {
                    const stateSnapshot = get();
                    const currentIndex = stateSnapshot.player.index;
                    const player = stateSnapshot.player;
                    const repeat = player.repeat;
                    const queue = getQueueOrderFromState(stateSnapshot);
                    const isShuffle = isShuffleEnabled(stateSnapshot);

                    const playbackLength = isShuffle
                        ? stateSnapshot.queue.shuffled.length
                        : queue.items.length;

                    const newPlayerNum = player.playerNum === 1 ? 2 : 1;
                    const { nextIndex: nextPlaybackIndex, shouldPause } = calculateNextIndex(
                        currentIndex,
                        playbackLength,
                        repeat,
                    );
                    const pauseOnNext = player.pauseOnNextSongEnd;
                    const newStatus =
                        shouldPause || pauseOnNext ? PlayerStatus.PAUSED : PlayerStatus.PLAYING;

                    set((state) => {
                        state.player.index = nextPlaybackIndex;
                        state.player.playerNum = newPlayerNum;
                        setTimestampStore(0);
                        state.player.status = newStatus;

                        if (pauseOnNext) {
                            state.player.pauseOnNextSongEnd = false;
                        }
                    });

                    if (repeat === PlayerRepeat.ONE && nextPlaybackIndex === currentIndex) {
                        eventEmitter.emit('PLAYER_REPEATED', {
                            index: nextPlaybackIndex,
                        });
                    }

                    // Compute current/next/previous using the same shuffle-aware mapping as getPlayerData().
                    let currentQueueIndex = nextPlaybackIndex;
                    if (isShuffle) {
                        currentQueueIndex = mapShuffledToQueueIndex(
                            nextPlaybackIndex,
                            stateSnapshot.queue.shuffled,
                        );
                    }

                    const currentSong = queue.items[currentQueueIndex];

                    let nextSong: QueueSong | undefined;
                    if (isShuffle && repeat !== PlayerRepeat.ONE) {
                        const nextShuffledIndex = nextPlaybackIndex + 1;
                        if (nextShuffledIndex < stateSnapshot.queue.shuffled.length) {
                            const nextQueueIndex = stateSnapshot.queue.shuffled[nextShuffledIndex];
                            nextSong = queue.items[nextQueueIndex];
                        } else if (repeat === PlayerRepeat.ALL) {
                            const firstQueueIndex = stateSnapshot.queue.shuffled[0];
                            nextSong = queue.items[firstQueueIndex];
                        }
                    } else {
                        nextSong = calculateNextSong(currentQueueIndex, queue.items, repeat);
                    }

                    let previousSong: QueueSong | undefined;
                    if (isShuffle) {
                        const prevShuffledIndex = nextPlaybackIndex - 1;
                        if (prevShuffledIndex >= 0) {
                            const prevQueueIndex = stateSnapshot.queue.shuffled[prevShuffledIndex];
                            previousSong = queue.items[prevQueueIndex];
                        } else if (repeat === PlayerRepeat.ALL) {
                            const lastShuffledIndex = stateSnapshot.queue.shuffled.length - 1;
                            const lastQueueIndex = stateSnapshot.queue.shuffled[lastShuffledIndex];
                            previousSong = queue.items[lastQueueIndex];
                        }
                    } else {
                        previousSong =
                            currentQueueIndex > 0 ? queue.items[currentQueueIndex - 1] : undefined;
                    }

                    return {
                        currentSong,
                        index: currentQueueIndex,
                        nextSong,
                        num: newPlayerNum,
                        player1: newPlayerNum === 1 ? currentSong : nextSong,
                        player2: newPlayerNum === 2 ? currentSong : nextSong,
                        previousSong,
                        queueLength: queue.items.length,
                        status: newStatus,
                    };
                },
                mediaNext: () => {
                    const state = get();
                    const currentIndex = state.player.index;
                    const player = state.player;
                    const queue = getQueueOrderFromState(state);
                    const isLastTrack = currentIndex === queue.items.length - 1;

                    let nextIndex: number;

                    if (player.repeat === PlayerRepeat.ALL && isLastTrack) {
                        // Repeat all: wrap to first track when on last track
                        nextIndex = 0;
                    } else if (player.repeat === PlayerRepeat.NONE && isLastTrack) {
                        // Repeat none: stay on last track if already there
                        nextIndex = currentIndex;
                    } else {
                        // Otherwise, advance to next track (including repeat ONE for manual navigation)
                        // When shuffle is enabled, currentIndex is already the position in the shuffled array
                        nextIndex = Math.min(queue.items.length - 1, currentIndex + 1);
                    }

                    set((state) => {
                        state.player.index = nextIndex;
                        state.player.playerNum = 1;
                        setTimestampStore(0);
                    });

                    eventEmitter.emit('MEDIA_NEXT', {
                        currentIndex,
                        nextIndex,
                    });
                },
                mediaPause: () => {
                    set((state) => {
                        state.player.status = PlayerStatus.PAUSED;
                    });
                },
                mediaPlay: (id?: string) => {
                    if (id) {
                        claimMusicPlayback();
                    }

                    let playIndex: number | undefined;

                    set((state) => {
                        if (id) {
                            const queue = getQueueFromState(state);

                            // Find the song in the original queue
                            const queueIndex = queue.items.findIndex(
                                (item) => item._uniqueId === id,
                            );

                            if (queueIndex !== -1) {
                                if (
                                    state.player.shuffle === PlayerShuffle.TRACK &&
                                    state.queue.shuffled.length > 0
                                ) {
                                    // Find the shuffled position for this queue index
                                    const shuffledPosition = state.queue.shuffled.findIndex(
                                        (idx) => idx === queueIndex,
                                    );
                                    if (shuffledPosition !== -1) {
                                        state.player.index = shuffledPosition;
                                        playIndex = shuffledPosition;
                                    } else {
                                        state.player.index = queueIndex;
                                        playIndex = queueIndex;
                                    }
                                } else {
                                    state.player.index = queueIndex;
                                    playIndex = queueIndex;
                                }
                                setTimestampStore(0);
                            }
                        }

                        state.player.status = PlayerStatus.PLAYING;
                    });

                    if (id && playIndex !== undefined) {
                        eventEmitter.emit('PLAYER_PLAY', {
                            id,
                            index: playIndex,
                        });
                    }
                },
                mediaPlayByIndex: (index: number) => {
                    claimMusicPlayback();

                    let playIndex: number | undefined;
                    let songId: string | undefined;

                    set((state) => {
                        const queue = getQueueFromState(state);

                        if (index === -1 || index >= queue.items.length) {
                            state.player.status = PlayerStatus.PAUSED;
                            return;
                        }

                        // Get the song's unique ID from the queue
                        const song = queue.items[index];
                        if (song) {
                            songId = song._uniqueId;
                        }

                        // index is the position in the original queue
                        if (isShuffleEnabled(state)) {
                            // Find the shuffled position for this queue index
                            const shuffledPosition = findShuffledPositionForQueueIndex(
                                index,
                                state.queue.shuffled,
                            );
                            playIndex = shuffledPosition !== undefined ? shuffledPosition : index;
                            state.player.index = playIndex;
                        } else {
                            playIndex = index;
                            state.player.index = index;
                        }
                        setTimestampStore(0);

                        state.player.status = PlayerStatus.PLAYING;
                    });

                    if (songId && playIndex !== undefined) {
                        eventEmitter.emit('PLAYER_PLAY', {
                            id: songId,
                            index: playIndex,
                        });
                    }
                },
                mediaPrevious: () => {
                    const currentIndex = get().player.index;
                    const player = get().player;
                    const queue = getQueueOrderFromState(get());
                    const currentTimestamp = useTimestampStoreBase.getState().timestamp;
                    const isFirstTrack = currentIndex === 0;

                    // If timestamp is greater than 5 seconds, restart current song
                    if (currentTimestamp > 5) {
                        emitPlayerSeek(0);
                        return;
                    }

                    let previousIndex: number;

                    if (player.repeat === PlayerRepeat.ALL && isFirstTrack) {
                        // Repeat all: wrap to last track when on first track
                        previousIndex = queue.items.length - 1;
                    } else if (player.repeat === PlayerRepeat.NONE && isFirstTrack) {
                        // Repeat none: stay on first track if already there
                        previousIndex = currentIndex;
                    } else {
                        // Otherwise, go to previous track
                        previousIndex = Math.max(0, currentIndex - 1);
                    }

                    set((state) => {
                        state.player.index = previousIndex;
                        state.player.playerNum = 1;
                        setTimestampStore(0);
                    });

                    eventEmitter.emit('MEDIA_PREV', {
                        currentIndex,
                        prevIndex: previousIndex,
                    });
                },
                mediaSeekToTimestamp: (timestamp: number) => {
                    emitPlayerSeek(timestamp);
                },
                mediaSkipBackward: (offset?: number) => {
                    const offsetFromSettings =
                        useSettingsStore.getState().general.skipButtons.skipBackwardSeconds;
                    const timeToSkip = offset ?? offsetFromSettings ?? 5;
                    const currentTimestamp = useTimestampStoreBase.getState().timestamp;
                    const newTimestamp = Math.max(0, currentTimestamp - timeToSkip);

                    emitPlayerSeek(newTimestamp);
                },
                mediaSkipForward: (offset?: number) => {
                    const state = get();
                    const queue = getQueueFromState(state);
                    const index = state.player.index;
                    const currentTrack = queue.items[index];
                    const duration = currentTrack?.duration;
                    const offsetFromSettings =
                        useSettingsStore.getState().general.skipButtons.skipForwardSeconds;
                    const timeToSkip = offset ?? offsetFromSettings ?? 5;

                    if (!duration) {
                        return;
                    }

                    const currentTimestamp = useTimestampStoreBase.getState().timestamp;
                    const newTimestamp = Math.min(duration - 1, currentTimestamp + timeToSkip);

                    emitPlayerSeek(newTimestamp);
                },
                mediaStop: (options?: { reset?: boolean }) => {
                    const reset = options?.reset !== false;
                    set((state) => {
                        state.player.status = PlayerStatus.PAUSED;
                        setTimestampStore(0);
                    });
                    if (reset) {
                        emitPlayerSeek(0);
                    }
                },
                mediaToggleMute: () => {
                    set((state) => {
                        state.player.muted = !state.player.muted;
                    });
                },
                mediaTogglePlayPause: () => {
                    set((state) => {
                        if (state.player.status === PlayerStatus.PLAYING) {
                            state.player.status = PlayerStatus.PAUSED;
                        } else {
                            state.player.status = PlayerStatus.PLAYING;
                        }
                    });
                },
                moveSelectedTo: (items: QueueSong[], uniqueId: string, edge: 'bottom' | 'top') => {
                    const itemUniqueIds = items.map((item) => item._uniqueId);

                    set((state) => {
                        const existingIds = new Set(Object.keys(state.queue.songs));

                        // Add new songs to songs object (avoiding duplicates)
                        items.forEach((item) => {
                            if (!existingIds.has(item._uniqueId)) {
                                state.queue.songs[item._uniqueId] = item;
                            }
                        });

                        // Find the index of the drop target
                        const index = state.queue.default.findIndex((id) => id === uniqueId);

                        // Get the new index based on the edge
                        const insertIndex = Math.max(0, edge === 'top' ? index : index + 1);

                        const idsBefore = state.queue.default
                            .slice(0, insertIndex)
                            .filter((id) => !itemUniqueIds.includes(id));

                        const idsAfter = state.queue.default
                            .slice(insertIndex)
                            .filter((id) => !itemUniqueIds.includes(id));

                        const newQueue = [...idsBefore, ...itemUniqueIds, ...idsAfter];

                        recalculatePlayerIndex(state, newQueue);
                        state.queue.default = newQueue;
                    });
                },
                moveSelectedToBottom: (items: QueueSong[]) => {
                    set((state) => {
                        const uniqueIds = items.map((item) => item._uniqueId);

                        // Add new songs to songs object
                        items.forEach((item) => {
                            state.queue.songs[item._uniqueId] = item;
                        });

                        const filtered = state.queue.default.filter(
                            (id) => !uniqueIds.includes(id),
                        );

                        const newQueue = [...filtered, ...uniqueIds];

                        recalculatePlayerIndex(state, newQueue);

                        state.queue.default = newQueue;
                    });
                },
                moveSelectedToNext: (items: QueueSong[]) => {
                    set((state) => {
                        const uniqueIds = items.map((item) => item._uniqueId);

                        // Add new songs to songs object
                        items.forEach((item) => {
                            state.queue.songs[item._uniqueId] = item;
                        });

                        const currentIndex = state.player.index;
                        let beforeCurrent = 0;
                        const filtered = state.queue.default.filter((id, idx) => {
                            const shouldMove = uniqueIds.includes(id);
                            if (shouldMove && idx < currentIndex) {
                                beforeCurrent++;
                            }

                            return !shouldMove;
                        });

                        // For every item that is before the current item, subtract one as
                        // these items will shift the queue up
                        const insertIndex = currentIndex + 1 - beforeCurrent;

                        const newQueue = [
                            ...filtered.slice(0, insertIndex),
                            ...uniqueIds,
                            ...filtered.slice(insertIndex),
                        ];

                        recalculatePlayerIndex(state, newQueue);
                        state.queue.default = newQueue;
                    });
                },
                moveSelectedToTop: (items: QueueSong[]) => {
                    set((state) => {
                        const uniqueIds = items.map((item) => item._uniqueId);

                        // Add new songs to songs object
                        items.forEach((item) => {
                            state.queue.songs[item._uniqueId] = item;
                        });

                        const filtered = state.queue.default.filter(
                            (id) => !uniqueIds.includes(id),
                        );

                        const newQueue = [...uniqueIds, ...filtered];

                        recalculatePlayerIndex(state, newQueue);

                        state.queue.default = newQueue;
                    });
                },
                setQueue: (items, index, position, context, autoPlay = true) => {
                    claimMusicPlayback();

                    const nextContext = context ?? SONG_CONTEXT;

                    const newItems = items.map(toQueueSong);
                    const newUniqueIds = newItems.map((item) => item._uniqueId);

                    set((state) => {
                        newItems.forEach((item) => {
                            state.queue.songs[item._uniqueId] = item;
                        });

                        state.player.index = index ?? 0;
                        state.player.status = autoPlay ? PlayerStatus.PLAYING : PlayerStatus.PAUSED;
                        state.player.playerNum = 1;
                        state.player.context = nextContext;
                        state.queue.default = newUniqueIds;
                    });

                    rememberMusicPlaybackSession({ context: nextContext });

                    eventEmitter.emit('QUEUE_RESTORED', {
                        data: items,
                        index: index ?? 0,
                        position: position ?? 0,
                    });
                },
                ...initialState,
                setCrossfadeDuration: (duration: number) => {
                    set((state) => {
                        const normalizedDuration = Math.max(0, Math.min(10, duration));
                        state.player.crossfadeDuration = normalizedDuration;
                    });
                },
                setCrossfadeStyle: (style: CrossfadeStyle) => {
                    set((state) => {
                        state.player.crossfadeStyle = style;
                    });
                },
                setMusicPlaybackContext: (context: MusicPlaybackContext) => {
                    set((state) => {
                        state.player.context = context;
                    });
                    rememberMusicPlaybackSession({ context });
                },
                setPauseOnNextSongEnd: (value: boolean) => {
                    set((state) => {
                        state.player.pauseOnNextSongEnd = value;
                    });
                },
                setRepeat: (repeat: PlayerRepeat) => {
                    set((state) => {
                        state.player.repeat = repeat;
                    });
                },
                setShuffle: (shuffle: PlayerShuffle) => {
                    set((state) => {
                        const wasShuffled = state.player.shuffle === PlayerShuffle.TRACK;
                        const willBeShuffled = shuffle === PlayerShuffle.TRACK;
                        const currentIndex = state.player.index;

                        state.player.shuffle = shuffle;

                        if (willBeShuffled) {
                            state.queue.shuffled = generateShuffledIndexes(
                                state.queue.default.length,
                            );

                            // Convert current index to shuffled position if there's a current song
                            if (currentIndex >= 0 && currentIndex < state.queue.default.length) {
                                // Find the shuffled position that corresponds to the current queue position
                                const shuffledPosition = findShuffledPositionForQueueIndex(
                                    currentIndex,
                                    state.queue.shuffled,
                                );
                                if (shuffledPosition !== undefined) {
                                    state.player.index = shuffledPosition;
                                }
                            }
                        } else {
                            // When disabling shuffle, convert shuffled position back to queue position
                            if (
                                wasShuffled &&
                                currentIndex >= 0 &&
                                currentIndex < state.queue.shuffled.length
                            ) {
                                const queuePosition = state.queue.shuffled[currentIndex];
                                if (queuePosition !== undefined) {
                                    state.player.index = queuePosition;
                                }
                            }
                            state.queue.shuffled = [];
                        }
                        cleanupOrphanedSongs(state);
                    });
                },
                setSpeed: (speed: number) => {
                    set((state) => {
                        const normalizedSpeed = Math.max(0.5, Math.min(2, speed));
                        state.player.speed = normalizedSpeed;
                    });
                },
                setTransitionType: (transitionType: PlayerStyle) => {
                    set((state) => {
                        state.player.transitionType = transitionType;
                    });
                },
                setVolume: (volume: number) => {
                    set((state) => {
                        state.player.volume = volume;
                    });
                },
                shuffle: () => {
                    set((state) => {
                        if (state.player.shuffle === PlayerShuffle.TRACK) {
                            state.queue.shuffled = generateShuffledIndexes(
                                state.queue.default.length,
                            );
                        }
                    });
                },
                shuffleAll: () => {
                    set((state) => {
                        const queue = getQueueFromState(state);
                        const currentIndex = state.player.index;
                        const currentSong = queue.items[currentIndex];

                        // If there's a current song playing, keep it in place
                        if (currentSong && currentIndex >= 0 && currentIndex < queue.items.length) {
                            const currentUniqueId = currentSong._uniqueId;
                            const currentQueueIndex = state.queue.default.findIndex(
                                (id) => id === currentUniqueId,
                            );

                            if (currentQueueIndex !== -1) {
                                const beforeItems = state.queue.default.slice(0, currentQueueIndex);
                                const afterItems = state.queue.default.slice(currentQueueIndex + 1);

                                const shuffledBefore = shuffleInPlace([...beforeItems]);
                                const shuffledAfter = shuffleInPlace([...afterItems]);

                                state.queue.default = [
                                    ...shuffledBefore,
                                    currentUniqueId,
                                    ...shuffledAfter,
                                ];
                            } else {
                                // Current song not in default queue, just shuffle everything
                                state.queue.default = shuffleInPlace([...state.queue.default]);
                            }
                        } else {
                            // No current song, shuffle everything
                            state.queue.default = shuffleInPlace([...state.queue.default]);
                        }

                        // Regenerate shuffled indexes if shuffle is enabled
                        regenerateShuffledIndexesIfNeeded(state);
                    });
                },
                shuffleSelected: (items: QueueSong[]) => {
                    set((state) => {
                        const itemUniqueIds = items.map((item) => item._uniqueId);

                        // Find positions of selected items in the default queue
                        const selectedPositions = itemUniqueIds
                            .map((id) => state.queue.default.findIndex((i) => i === id))
                            .filter((idx) => idx !== -1)
                            .sort((a, b) => a - b); // Sort to maintain order

                        if (selectedPositions.length === 0) {
                            return;
                        }

                        // Get the selected items in their current order
                        const selectedItems = selectedPositions.map(
                            (pos) => state.queue.default[pos],
                        );

                        // Shuffle the selected items
                        const shuffledItems = shuffleInPlace([...selectedItems]);

                        // Rebuild the default queue with shuffled selected items
                        const newDefaultQueue = [...state.queue.default];
                        selectedPositions.forEach((pos, i) => {
                            newDefaultQueue[pos] = shuffledItems[i];
                        });

                        state.queue.default = newDefaultQueue;

                        // Regenerate shuffled indexes if shuffle is enabled
                        regenerateShuffledIndexesIfNeeded(state);
                    });
                },
                toggleRepeat: () => {
                    set((state) => {
                        if (state.player.repeat === PlayerRepeat.NONE) {
                            state.player.repeat = PlayerRepeat.ONE;
                        } else if (state.player.repeat === PlayerRepeat.ONE) {
                            state.player.repeat = PlayerRepeat.ALL;
                        } else {
                            state.player.repeat = PlayerRepeat.NONE;
                        }
                    });
                },
                toggleShuffle: () => {
                    set((state) => {
                        const wasShuffled = state.player.shuffle === PlayerShuffle.TRACK;
                        const willBeShuffled = state.player.shuffle !== PlayerShuffle.TRACK;
                        const currentIndex = state.player.index;

                        state.player.shuffle =
                            state.player.shuffle === PlayerShuffle.NONE
                                ? PlayerShuffle.TRACK
                                : PlayerShuffle.NONE;

                        if (willBeShuffled) {
                            // Enabling shuffle: create shuffled indexes with current track as first
                            const combinedLength = state.queue.default.length;

                            if (
                                combinedLength > 0 &&
                                currentIndex >= 0 &&
                                currentIndex < combinedLength
                            ) {
                                // Get the current queue position (actual index in combined queue)
                                const currentQueuePosition = currentIndex;

                                // Create shuffled indexes with current track first
                                const remainingIndexes = Array.from(
                                    { length: combinedLength },
                                    (_, i) => i,
                                ).filter((idx) => idx !== currentQueuePosition);
                                const shuffledRemaining = shuffleInPlace([...remainingIndexes]);

                                state.queue.shuffled = [currentQueuePosition, ...shuffledRemaining];

                                // Set player index to 0 since current track is now first in shuffled array
                                state.player.index = 0;
                            } else {
                                // No current track, just generate shuffled indexes normally
                                state.queue.shuffled = generateShuffledIndexes(combinedLength);
                            }
                        } else {
                            // Disabling shuffle: clear shuffled indexes and convert index back
                            if (
                                wasShuffled &&
                                currentIndex >= 0 &&
                                currentIndex < state.queue.shuffled.length
                            ) {
                                const queuePosition = state.queue.shuffled[currentIndex];
                                if (queuePosition !== undefined) {
                                    state.player.index = queuePosition;
                                }
                            }
                            state.queue.shuffled = [];
                        }
                    });
                },
            })),
        ),
        {
            merge: (persistedState: any, currentState: any) => {
                const merged = merge(currentState, persistedState) as PlayerState;
                merged.playbackSnapshot = computePlayerData(merged);
                return merged;
            },
            migrate: async (persistedState, oldVersion) => {
                if (oldVersion < 3) {
                    return {} as PlayerState;
                }

                if (oldVersion === 3) {
                    await migratePlayerStorePersist('player-store');
                    return persistedState as Partial<PlayerState>;
                }

                return persistedState as Partial<PlayerState>;
            },
            name: 'player-store',
            onRehydrateStorage: () => () => {
                setPlayerStoreHydratedForPersistence(true);
                usePlayerStoreBase.setState((state) => {
                    state.hydrated = true;
                    state.playbackSnapshot = computePlayerData(state);
                });
            },
            partialize: (state) => {
                // The `general.resume` setting is the master kill switch. When false, we never
                // persist the queue regardless of context — the user has opted out of resume
                // entirely and `RestoreLastPlaybackSessionHook` becomes the only restoration path
                // (one-track lifeboat for music, audiobook/podcast/radio still restore from their
                // own session metadata).
                const resumeEnabled = useSettingsStore.getState().general.resume;

                // Persist the queue only for "structured" contexts where the queue itself is the
                // listening intent (album, playlist). Ad-hoc song plays don't bloat the queue
                // across launches; their continuity comes from `last-playback-session.store`.
                const persistQueue =
                    resumeEnabled && isStructuredMusicContext(state.player.context);

                // playerNum / status are ephemeral and never restored.
                const excludedPlayerKeys = ['playerNum', 'status'];

                // The current index only makes sense when its queue is being restored alongside.
                if (!persistQueue) {
                    excludedPlayerKeys.push('index');
                }

                const player = Object.fromEntries(
                    Object.entries(state.player).filter(
                        ([key]) => !excludedPlayerKeys.includes(key),
                    ),
                ) as typeof state.player;

                if (!persistQueue) {
                    return { player };
                }

                // Queue pruning and IDB writes are handled in `playerStoreStorage` so we only
                // serialize the large queue when the queue slice reference actually changes.
                return { player, queue: state.queue };
            },
            storage: playerStoreStorage,
            version: 4,
        },
    ),
);

let lastPlaybackInputs = getPlaybackInputs(usePlayerStoreBase.getState());

usePlayerStoreBase.subscribe((state) => {
    const nextInputs = getPlaybackInputs(state);
    if (playbackInputsEqual(lastPlaybackInputs, nextInputs)) {
        return;
    }

    lastPlaybackInputs = nextInputs;
    usePlayerStoreBase.setState({ playbackSnapshot: computePlayerData(state) });
});

export const usePlayerStore = createSelectors(usePlayerStoreBase);

export const getCurrentSong = (state: PlayerState = usePlayerStoreBase.getState()) =>
    getCurrentSongFromState(state);

export const getPlayerData = (state: PlayerState = usePlayerStoreBase.getState()) =>
    getPlayerDataFromState(state);

export const getQueue = (
    groupBy?: QueueGroupingProperty,
    state: PlayerState = usePlayerStoreBase.getState(),
) => getQueueFromState(state, groupBy);

export const getQueueOrder = (state: PlayerState = usePlayerStoreBase.getState()) =>
    getQueueOrderFromState(state);

export const isFirstTrackInQueue = (state: PlayerState = usePlayerStoreBase.getState()) =>
    isFirstTrackInQueueFromState(state);

export const isLastTrackInQueue = (state: PlayerState = usePlayerStoreBase.getState()) =>
    isLastTrackInQueueFromState(state);

export const usePlayerActions = () => {
    const actions = usePlayerStoreBase(
        useShallow((state) => ({
            addToQueueByType: state.addToQueueByType,
            addToQueueByUniqueId: state.addToQueueByUniqueId,
            clearQueue: state.clearQueue,
            clearSelected: state.clearSelected,
            decreaseVolume: state.decreaseVolume,
            increaseVolume: state.increaseVolume,
            mediaAutoNext: state.mediaAutoNext,
            mediaNext: state.mediaNext,
            mediaPause: state.mediaPause,
            mediaPlay: state.mediaPlay,
            mediaPlayByIndex: state.mediaPlayByIndex,
            mediaPrevious: state.mediaPrevious,
            mediaSeekToTimestamp: state.mediaSeekToTimestamp,
            mediaSkipBackward: state.mediaSkipBackward,
            mediaSkipForward: state.mediaSkipForward,
            mediaStop: state.mediaStop,
            mediaToggleMute: state.mediaToggleMute,
            mediaTogglePlayPause: state.mediaTogglePlayPause,
            moveSelectedTo: state.moveSelectedTo,
            moveSelectedToBottom: state.moveSelectedToBottom,
            moveSelectedToNext: state.moveSelectedToNext,
            moveSelectedToTop: state.moveSelectedToTop,
            setCrossfadeDuration: state.setCrossfadeDuration,
            setCrossfadeStyle: state.setCrossfadeStyle,
            setMusicPlaybackContext: state.setMusicPlaybackContext,
            setPauseOnNextSongEnd: state.setPauseOnNextSongEnd,
            setQueue: state.setQueue,
            setRepeat: state.setRepeat,
            setShuffle: state.setShuffle,
            setSpeed: state.setSpeed,
            setTransitionType: state.setTransitionType,
            setVolume: state.setVolume,
            shuffle: state.shuffle,
            shuffleAll: state.shuffleAll,
            shuffleSelected: state.shuffleSelected,
            toggleRepeat: state.toggleRepeat,
            toggleShuffle: state.toggleShuffle,
        })),
    );

    return useMemo(
        () => ({
            ...actions,
            getQueue: (groupBy?: QueueGroupingProperty) =>
                getQueueFromState(usePlayerStoreBase.getState(), groupBy),
            isFirstTrackInQueue: () =>
                isFirstTrackInQueueFromState(usePlayerStoreBase.getState()),
            isLastTrackInQueue: () => isLastTrackInQueueFromState(usePlayerStoreBase.getState()),
            setTimestamp: setTimestampStore,
        }),
        [actions],
    );
};

export type AddToQueueByPlayType = Play;

export type AddToQueueByUniqueId = {
    edge: 'bottom' | 'left' | 'right' | 'top' | null;
    uniqueId: string;
};

export type AddToQueueType = AddToQueueByPlayType | AddToQueueByUniqueId;

export async function addToQueueByData(type: AddToQueueType, data: Song[]) {
    claimMusicPlayback();

    const items = data.map(toQueueSong);

    if (typeof type === 'string') {
        usePlayerStoreBase.getState().addToQueueByType(items, type);
    } else {
        const normalizedEdge = type.edge === 'top' ? 'top' : 'bottom';
        usePlayerStoreBase.getState().addToQueueByUniqueId(items, type.uniqueId, normalizedEdge);
    }
}

export const subscribePlayerQueue = (
    onChange: (queue: QueueData, prevQueue: QueueData) => void,
) => {
    return usePlayerStoreBase.subscribe(
        (state) => state.queue,
        (queue, prevQueue) => {
            onChange(queue, prevQueue);
        },
    );
};

export const subscribeCurrentTrack = (
    onChange: (
        properties: { index: number; song: QueueSong | undefined },
        prev: { index: number; song: QueueSong | undefined },
    ) => void,
) => {
    return usePlayerStoreBase.subscribe(
        (state) => {
            const queue = getQueueFromState(state);
            let index = state.player.index;

            if (isShuffleEnabled(state)) {
                index = mapShuffledToQueueIndex(index, state.queue.shuffled);
            }

            return { index, song: queue.items[index] };
        },
        (song, prevSong) => {
            onChange(song, prevSong);
        },
        {
            equalityFn: (a, b) => {
                return a.song?._uniqueId === b.song?._uniqueId;
            },
        },
    );
};

export const subscribeNextSongInsertion = (onChange: (song: QueueSong | undefined) => void) => {
    return usePlayerStoreBase.subscribe(
        (state) => {
            const queue = getQueueFromState(state);
            let queueIndex = state.player.index;
            const repeat = state.player.repeat;

            // If shuffle is enabled, map shuffled position to actual queue position
            if (isShuffleEnabled(state)) {
                queueIndex = mapShuffledToQueueIndex(queueIndex, state.queue.shuffled);
            }

            const currentSong = queue.items[queueIndex];

            // Calculate next song based on shuffle and repeat settings
            let nextSong: QueueSong | undefined;
            if (isShuffleEnabled(state) && repeat !== PlayerRepeat.ONE) {
                // Calculate next in shuffled order
                const nextShuffledIndex = state.player.index + 1;
                if (nextShuffledIndex < state.queue.shuffled.length) {
                    const nextQueueIndex = state.queue.shuffled[nextShuffledIndex];
                    nextSong = queue.items[nextQueueIndex];
                } else if (repeat === PlayerRepeat.ALL) {
                    // Wrap to first in shuffled order
                    const firstQueueIndex = state.queue.shuffled[0];
                    nextSong = queue.items[firstQueueIndex];
                }
            } else {
                nextSong = calculateNextSong(queueIndex, queue.items, repeat);
            }

            return {
                currentUniqueId: currentSong?._uniqueId,
                nextSong,
            };
        },
        (current, prev) => {
            if (!prev) {
                return;
            }

            // Still on the same track, but the upcoming song changed (queue edit: insert, reorder, etc.).
            // Do not require the current track's queue index to stay fixed — e.g. inserting *before* the
            // current item shifts its index in `queue.default`, and the old check missed that case.
            const sameTrackStillPlaying =
                current.currentUniqueId !== undefined &&
                current.currentUniqueId === prev.currentUniqueId;

            if (sameTrackStillPlaying && current.nextSong?._uniqueId !== prev.nextSong?._uniqueId) {
                onChange(current.nextSong);
            }
        },
        {
            // Always allow the subscription to fire so we can check conditions in the callback
            equalityFn: () => false,
        },
    );
};

export const subscribePlayerVolume = (
    onChange: (properties: { volume: number }, prev: { volume: number }) => void,
) => {
    return usePlayerStoreBase.subscribe(
        (state) => state.player.volume,
        (volume, prevVolume) => {
            onChange({ volume }, { volume: prevVolume });
        },
    );
};

export const subscribePlayerStatus = (
    onChange: (properties: { status: PlayerStatus }, prev: { status: PlayerStatus }) => void,
) => {
    return usePlayerStoreBase.subscribe(
        (state) => state.player.status,
        (status, prevStatus) => {
            onChange({ status }, { status: prevStatus });
        },
    );
};

/** @deprecated Use subscribePlayerSeek — seeks are event-bus driven (F8). */
export const subscribePlayerSeekToTimestamp = subscribePlayerSeek;

export { subscribePlayerSeek } from '/@/renderer/store/player/seek';

export const subscribePlayerMute = (
    onChange: (properties: { muted: boolean }, prev: { muted: boolean }) => void,
) => {
    return usePlayerStoreBase.subscribe(
        (state) => state.player.muted,
        (muted, prevMuted) => {
            onChange({ muted }, { muted: prevMuted });
        },
    );
};

export const subscribePlayerSpeed = (
    onChange: (properties: { speed: number }, prev: { speed: number }) => void,
) => {
    return usePlayerStoreBase.subscribe(
        (state) => state.player.speed,
        (speed, prevSpeed) => {
            onChange({ speed }, { speed: prevSpeed });
        },
    );
};

export const subscribePlayerRepeat = (
    onChange: (properties: { repeat: PlayerRepeat }, prev: { repeat: PlayerRepeat }) => void,
) => {
    return usePlayerStoreBase.subscribe(
        (state) => state.player.repeat,
        (repeat, prevRepeat) => {
            onChange({ repeat }, { repeat: prevRepeat });
        },
    );
};

export const subscribePlayerShuffle = (
    onChange: (properties: { shuffle: PlayerShuffle }, prev: { shuffle: PlayerShuffle }) => void,
) => {
    return usePlayerStoreBase.subscribe(
        (state) => state.player.shuffle,
        (shuffle, prevShuffle) => {
            onChange({ shuffle }, { shuffle: prevShuffle });
        },
    );
};

export const subscribeQueueCleared = (onChange: () => void) => {
    return usePlayerStoreBase.subscribe(
        (state) => state.queue,
        (queue, prevQueue) => {
            // Detect if queue became empty
            const wasNotEmpty = prevQueue.default.length > 0;
            const isEmpty = queue.default.length === 0;

            if (wasNotEmpty && isEmpty) {
                onChange();
            }
        },
    );
};

export const usePlayerProperties = () => {
    return usePlayerStoreBase(
        useShallow((state) => ({
            crossfadeDuration: state.player.crossfadeDuration,
            crossfadeStyle: state.player.crossfadeStyle,
            isMuted: state.player.muted,
            playerNum: state.player.playerNum,
            repeat: state.player.repeat,
            shuffle: state.player.shuffle,
            speed: state.player.speed,
            status: state.player.status,
            transitionType: state.player.transitionType,
            volume: state.player.volume,
        })),
    );
};

/** Single subscription for components that read multiple transport fields (F12). */
export const usePlayerVolumeState = () =>
    usePlayerStoreBase(
        useShallow((state) => ({
            muted: state.player.muted,
            volume: state.player.volume,
        })),
    );

export const usePlayerPlaybackControlsState = () =>
    usePlayerStoreBase(
        useShallow((state) => ({
            repeat: state.player.repeat,
            shuffle: state.player.shuffle,
            status: state.player.status,
        })),
    );

export const usePlayerMpvEngineState = () =>
    usePlayerStoreBase(
        useShallow((state) => ({
            muted: state.player.muted,
            speed: state.player.speed,
            volume: state.player.volume,
        })),
    );

export const usePlayerDuration = () => {
    return usePlayerStoreBase((state) => state.playbackSnapshot.currentSong?.duration);
};

export const usePlayerData = (): PlayerData => {
    return usePlayerStoreBase(useShallow((state) => state.playbackSnapshot));
};

export const updateQueueFavorites = (ids: string[], favorite: boolean) => {
    usePlayerStoreBase.setState((state) => {
        Object.values(state.queue.songs).forEach((song) => {
            if (ids.includes(song.id)) {
                song.userFavorite = favorite;
            }
        });
        touchQueueRevision(state.queue);
    });
};

export const updateQueueRatings = (ids: string[], rating: null | number) => {
    usePlayerStoreBase.setState((state) => {
        Object.values(state.queue.songs).forEach((song) => {
            if (ids.includes(song.id)) {
                song.userRating = rating;
            }
        });
        touchQueueRevision(state.queue);
    });
};

export const incrementQueuePlayCount = (ids: string[]) => {
    usePlayerStoreBase.setState((state) => {
        Object.values(state.queue.songs).forEach((song) => {
            if (ids.includes(song.id)) {
                song.playCount = (song.playCount || 0) + 1;
            }
        });
        touchQueueRevision(state.queue);
    });
};

export const updateQueueSong = (songId: string, updatedSong: Song) => {
    usePlayerStoreBase.setState((state) => {
        Object.values(state.queue.songs).forEach((song) => {
            if (song.id === songId) {
                const uniqueId = song._uniqueId;
                state.queue.songs[song._uniqueId] = {
                    ...updatedSong,
                    _uniqueId: uniqueId,
                };
            }
        });
        touchQueueRevision(state.queue);
    });
};

export const usePlayerMuted = () => {
    return usePlayerStoreBase((state) => state.player.muted);
};

export const usePlayerRepeat = () => {
    return usePlayerStoreBase((state) => state.player.repeat);
};

export const usePlayerShuffle = () => {
    return usePlayerStoreBase((state) => state.player.shuffle);
};

export const usePlayerStatus = () => {
    return usePlayerStoreBase((state) => state.player.status);
};

export const usePlayerHydrated = () => {
    return usePlayerStoreBase((state) => state.hydrated);
};

export const usePlayerVolume = () => {
    return usePlayerStoreBase((state) => state.player.volume);
};

export const usePlayerSpeed = () => {
    return usePlayerStoreBase((state) => state.player.speed);
};

export const usePlayerSong = () => {
    return usePlayerStoreBase(
        (state) => {
            return state.playbackSnapshot.currentSong;
        },
        (prev, next) => {
            return (
                prev?._uniqueId === next?._uniqueId &&
                prev?.userFavorite === next?.userFavorite &&
                prev?.userRating === next?.userRating
            );
        },
    );
};

export const usePlayerSongProperties = <T extends keyof QueueSong>(
    properties: T[],
): Partial<Pick<QueueSong, T>> => {
    return usePlayerStoreBase(
        useShallow((state) => {
            const song = state.playbackSnapshot.currentSong;
            if (!song) {
                return {};
            }

            const result = {} as Pick<QueueSong, T>;

            for (const prop of properties) {
                result[prop] = song[prop];
            }
            return result;
        }),
    );
};

export const usePlayerNum = () => {
    return usePlayerStoreBase((state) => state.player.playerNum);
};

export const usePlayerQueue = () => {
    return usePlayerStoreBase(
        useShallow((state) => {
            const songs = state.queue.songs;
            const queue = state.queue.default;
            const result: QueueSong[] = [];
            for (const id of queue) {
                const song = songs[id];
                if (song) result.push(song);
            }
            return result;
        }),
    );
};

function cleanupOrphanedSongs(state: any): boolean {
    const allQueueIds = new Set([
        ...state.queue.default,
        // shuffled now contains indexes, not uniqueIds, so we don't include it here
    ]);

    const songs = state.queue.songs;
    const songIds = Object.keys(songs);
    let hasOrphans = false;
    const orphanedIds: string[] = [];

    for (const songId of songIds) {
        if (!allQueueIds.has(songId)) {
            orphanedIds.push(songId);
            hasOrphans = true;
        }
    }

    if (hasOrphans) {
        const cleanedSongs: Record<string, QueueSong> = {};
        for (const songId of songIds) {
            if (!orphanedIds.includes(songId)) {
                cleanedSongs[songId] = songs[songId];
            }
        }
        state.queue.songs = cleanedSongs;
    }

    return hasOrphans;
}

function recalculatePlayerIndex(state: any, queue: string[]) {
    const currentTrack = getCurrentSongFromState(state);

    if (!currentTrack) {
        return;
    }

    const index = queue.findIndex((id) => id === currentTrack._uniqueId);
    state.player.index = Math.max(0, index);
}

function toQueueSong(item: Song): QueueSong {
    return {
        ...item,
        _uniqueId: nanoid(),
    };
}

export const usePlayerTransportSlice = () =>
    usePlayerStoreBase(
        useShallow((state) => ({
            crossfadeDuration: state.player.crossfadeDuration,
            crossfadeStyle: state.player.crossfadeStyle,
            index: state.player.index,
            muted: state.player.muted,
            pauseOnNextSongEnd: state.player.pauseOnNextSongEnd,
            playerNum: state.player.playerNum,
            repeat: state.player.repeat,
            shuffle: state.player.shuffle,
            speed: state.player.speed,
            status: state.player.status,
            transitionType: state.player.transitionType,
            volume: state.player.volume,
        })),
    );

export const usePlayerQueueSlice = () =>
    usePlayerStoreBase(
        useShallow((state) => ({
            default: state.queue.default,
            revision: state.queue.revision,
            shuffled: state.queue.shuffled,
            songs: state.queue.songs,
        })),
    );

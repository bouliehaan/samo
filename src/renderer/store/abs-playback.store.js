import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { createAbsPlaybackSyncHandle, POSITION_PERSIST_DEBOUNCE_S, wireAbsPauseProgressFlush, wireAbsPlaybackOwnerHandoff, } from '/@/renderer/store/abs-playback-sync';
import { clampPosition } from '/@/renderer/store/audiobook-resume-math';
import { identityPersistMigrate, PERSIST_VERSION_INITIAL, } from '/@/renderer/store/persist-migrate';
import { usePlayerStoreBase } from '/@/renderer/store/player.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { toast } from '/@/shared/components/toast/toast';
import { PlayerStatus } from '/@/shared/types/types';
import { logFn, LogCategory } from '/@/renderer/utils/logger';
const isPlayingForSync = () => usePlayerStoreBase.getState().player.status === PlayerStatus.PLAYING;
export function createAbsPlaybackStore(config) {
    let sync;
    const useStore = create()(subscribeWithSelector(persist((set, get) => {
        const getResumeMap = () => get()[config.resumeField];
        const flushCurrentResume = (current) => {
            const key = config.getResumeKey(current);
            if (!key) {
                return;
            }
            set((state) => ({
                [config.resumeField]: {
                    ...state[config.resumeField],
                    [key]: current.position,
                },
            }));
        };
        const baseActions = {
            release: () => {
                sync.bumpPlayRequest();
                const state = get();
                const key = config.getResumeKey(state);
                if (key) {
                    set((s) => ({
                        [config.resumeField]: {
                            ...s[config.resumeField],
                            [key]: state.position,
                        },
                    }));
                    if (state.server && state.item) {
                        config.rememberSession({
                            episode: config.getEpisodeForSync(state),
                            item: state.item,
                            position: state.position,
                            server: state.server,
                        });
                    }
                }
                sync.syncProgress({
                    closeSession: true,
                    countListeningTime: isPlayingForSync(),
                    force: true,
                    reason: 'close',
                });
                set({
                    ...config.clearTransientExtra(),
                    contentUrl: null,
                    duration: 0,
                    error: null,
                    isLoading: false,
                    item: null,
                    position: 0,
                    server: null,
                    sessionId: null,
                });
                sync.resetAfterClose();
                usePlaybackOwnerStore.getState().release(config.source);
            },
            seekTo: (seconds) => {
                const nextPosition = clampPosition(seconds, get().duration);
                set({ position: nextPosition });
                sync.setLastFlushedPosition(nextPosition);
                const state = get();
                const resumeUpdate = config.updateResumeOnSeek(state, nextPosition);
                if (resumeUpdate && state.server && state.item) {
                    set((s) => ({
                        [config.resumeField]: {
                            ...s[config.resumeField],
                            [resumeUpdate.key]: resumeUpdate.position,
                        },
                    }));
                    config.rememberSession({
                        episode: config.getEpisodeForSync(state),
                        item: state.item,
                        position: nextPosition,
                        server: state.server,
                    });
                }
                sync.syncProgress({
                    countListeningTime: isPlayingForSync(),
                    force: true,
                    reason: 'seek',
                });
            },
            setError: (error) => {
                set({ error });
            },
            setPosition: (seconds) => {
                const nextPosition = clampPosition(seconds, get().duration);
                set({ position: nextPosition });
                const drift = Math.abs(nextPosition - sync.getLastFlushedPosition());
                if (drift >= POSITION_PERSIST_DEBOUNCE_S) {
                    const state = get();
                    const resumeUpdate = config.updateResumeOnSeek(state, nextPosition);
                    if (resumeUpdate) {
                        set((s) => ({
                            [config.resumeField]: {
                                ...s[config.resumeField],
                                [resumeUpdate.key]: nextPosition,
                            },
                        }));
                        sync.setLastFlushedPosition(nextPosition);
                        const { server } = get();
                        if (server && state.item) {
                            config.rememberSession({
                                episode: config.getEpisodeForSync(state),
                                item: state.item,
                                position: nextPosition,
                                server,
                            });
                        }
                    }
                }
                sync.syncProgress({
                    countListeningTime: true,
                    reason: 'progress',
                });
            },
        };
        const play = async (...playArgs) => {
            const requestId = sync.bumpPlayRequest();
            const current = get();
            config.onBeforePlay?.(current, set, getResumeMap);
            if (current.item && current.server) {
                flushCurrentResume(current);
                config.rememberSession({
                    episode: config.getEpisodeForSync(current),
                    item: current.item,
                    position: current.position,
                    server: current.server,
                });
                sync.syncProgress({
                    closeSession: true,
                    countListeningTime: isPlayingForSync(),
                    force: true,
                    reason: 'close',
                });
            }
            const server = playArgs[0];
            const item = playArgs[1];
            const episode = config.requiresEpisode
                ? playArgs[2]
                : null;
            usePlaybackOwnerStore.getState().claim(config.source, { engine: 'web' });
            config.rememberSession({
                episode,
                item,
                position: 0,
                server,
            });
            config.recordRecent(item, server.id);
            set({
                ...config.getLoadingSeed(...playArgs),
                contentUrl: null,
                error: null,
                isLoading: true,
                item,
                position: 0,
                server,
                sessionId: null,
            });
            try {
                const result = await config.resolvePlaySession(...playArgs);
                if (!sync.isCurrentPlayRequest(requestId)) {
                    return;
                }
                sync.setLastFlushedPosition(result.position);
                sync.resetProgressSync(result.position);
                sync.resetSyncWarnings();
                set({
                    contentUrl: result.contentUrl,
                    duration: result.duration,
                    isLoading: false,
                    item: result.item,
                    position: result.position,
                    sessionId: result.sessionId,
                    ...(result.episode !== undefined ? { episode: result.episode } : {}),
                    ...result.patch,
                });
                config.rememberSession({
                    episode: result.episode ?? episode,
                    item: result.item,
                    position: result.position,
                    server,
                });
                usePlayerStoreBase.getState().mediaPlay();
            }
            catch (err) {
                if (!sync.isCurrentPlayRequest(requestId)) {
                    return;
                }
                const message = err instanceof Error ? err.message : String(err);
                logFn.error(`[${config.logLabel}] play() failed`, {
                    category: LogCategory.PLAYER,
                    meta: { err },
                });
                toast.error({
                    message: `${config.failureToastLabel}: ${message}`,
                });
                set({
                    error: message,
                    isLoading: false,
                });
                usePlaybackOwnerStore.getState().release(config.source);
            }
        };
        const actions = config.extendActions({
            base: baseActions,
            get: get,
            play,
            set: set,
            sync,
        });
        return {
            actions,
            contentUrl: null,
            duration: 0,
            error: null,
            isLoading: false,
            item: null,
            position: 0,
            server: null,
            sessionId: null,
            ...config.initialExtra,
            ...config.resumeInitial,
        };
    }, {
        migrate: (identityPersistMigrate),
        name: config.persistName,
        partialize: (state) => ({ [config.resumeField]: state[config.resumeField] }),
        version: PERSIST_VERSION_INITIAL,
    })));
    sync = createAbsPlaybackSyncHandle(config.logLabel, () => {
        const state = useStore.getState();
        return {
            duration: state.duration,
            episode: config.getEpisodeForSync(state),
            item: state.item,
            position: state.position,
            requiresEpisode: config.requiresEpisode,
            server: state.server,
            sessionId: state.sessionId,
        };
    });
    wireAbsPlaybackOwnerHandoff({
        clearTransientState: () => {
            useStore.setState({
                ...config.clearTransientExtra(),
                contentUrl: null,
                duration: 0,
                error: null,
                isLoading: false,
                item: null,
                position: 0,
                server: null,
                sessionId: null,
            });
        },
        onLoseOwnership: () => {
            const state = useStore.getState();
            const key = config.getResumeKey(state);
            if (key) {
                useStore.setState((s) => ({
                    [config.resumeField]: {
                        ...s[config.resumeField],
                        [key]: state.position,
                    },
                }));
            }
            config.onLoseOwnershipExtra?.(state);
            sync.syncProgress({
                closeSession: true,
                countListeningTime: isPlayingForSync(),
                force: true,
                reason: 'close',
            });
        },
        source: config.source,
        sync,
    });
    wireAbsPauseProgressFlush({ source: config.source, sync });
    return {
        selectors: {
            useActions: () => useStore((state) => state.actions),
            useContentUrl: () => useStore((state) => state.contentUrl),
            useDuration: () => useStore((state) => state.duration),
            useError: () => useStore((state) => state.error),
            useIsLoading: () => useStore((state) => state.isLoading),
            useItem: () => useStore((state) => state.item),
            usePosition: () => useStore((state) => state.position),
            useServer: () => useStore((state) => state.server),
        },
        store: useStore,
        sync,
    };
}

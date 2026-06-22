import type { PlaybackSource } from '/@/renderer/store/playback-owner.store';

import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

import {
    type AbsPlaybackSyncHandle,
    createAbsPlaybackSyncHandle,
    POSITION_PERSIST_DEBOUNCE_S,
    wireAbsPauseProgressFlush,
    wireAbsPlaybackOwnerHandoff,
} from '/@/renderer/store/abs-playback-sync';
import { clampPosition } from '/@/renderer/store/audiobook-resume-math';
import { identityPersistMigrate, PERSIST_VERSION_INITIAL } from '/@/renderer/store/persist-migrate';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { usePlayerStoreBase } from '/@/renderer/store/player.store';
import {
    LongFormLibraryItem,
    LongFormPodcastEpisode,
} from '/@/shared/api/long-form-types';
import { toast } from '/@/shared/components/toast/toast';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';
import { LogCategory, logFn } from '/@/shared/utils/logger';

export interface AbsPlaybackBaseActions {
    release: () => void;
    seekTo: (seconds: number) => void;
    setError: (error: null | string) => void;
    setPosition: (seconds: number) => void;
}

export interface AbsPlaybackCoreState {
    contentUrl: null | string;
    duration: number;
    error: null | string;
    isLoading: boolean;
    item: LongFormLibraryItem | null;
    position: number;
    server: null | null | ServerListItemWithCredential;
    sessionId: null | string;
}

export interface AbsPlaybackStoreBundle<
    TState extends AbsPlaybackCoreState & object,
    TActions extends AbsPlaybackBaseActions,
> {
    selectors: {
        useActions: () => TActions;
        useContentUrl: () => null | string;
        useDuration: () => number;
        useError: () => null | string;
        useIsLoading: () => boolean;
        useItem: () => LongFormLibraryItem | null;
        usePosition: () => number;
        useServer: () => null | ServerListItemWithCredential;
    };
    store: UseBoundStore<StoreApi<TState & { actions: TActions }>>;
    sync: AbsPlaybackSyncHandle;
}

export interface AbsPlaySessionResult {
    contentUrl: string;
    duration: number;
    episode?: LongFormPodcastEpisode | null;
    item: LongFormLibraryItem;
    patch?: Partial<AbsPlaybackCoreState>;
    position: number;
    sessionId: null | string;
}

export interface CreateAbsPlaybackStoreConfig<
    TResume extends object,
    TExtra extends object,
    TActions extends AbsPlaybackBaseActions,
    TResumeField extends keyof TResume & string,
> {
    clearTransientExtra: () => TExtra;
    extendActions: (api: {
        base: AbsPlaybackBaseActions;
        get: AbsStoreGet<AbsPlaybackCoreState & TExtra & TResume & { actions: TActions }>;
        play: (...playArgs: unknown[]) => Promise<void>;
        set: AbsStoreSet<AbsPlaybackCoreState & TExtra & TResume & { actions: TActions }>;
        sync: AbsPlaybackSyncHandle;
    }) => TActions;
    failureToastLabel: string;
    getEpisodeForSync: (
        state: AbsPlaybackCoreState & TExtra,
    ) => LongFormPodcastEpisode | null;
    getLoadingSeed: (...playArgs: unknown[]) => Partial<AbsPlaybackCoreState & TExtra>;
    getResumeKey: (state: AbsPlaybackCoreState & TExtra) => null | string;
    initialExtra: TExtra;
    logLabel: string;
    onBeforePlay?: (
        current: AbsPlaybackCoreState & TExtra,
        set: AbsStoreSet<AbsPlaybackCoreState & TExtra & TResume & { actions: TActions }>,
        getResumeMap: () => TResume,
    ) => void;
    onLoseOwnershipExtra?: (state: AbsPlaybackCoreState & TExtra) => void;
    persistName: string;
    playArgsLabel: string;
    recordRecent: (item: LongFormLibraryItem, serverId: string) => void;
    rememberSession: (args: {
        episode?: LongFormPodcastEpisode | null;
        item: LongFormLibraryItem;
        position?: number;
        server: ServerListItemWithCredential;
    }) => void;
    requiresEpisode: boolean;
    resolvePlaySession: (...playArgs: unknown[]) => Promise<AbsPlaySessionResult>;
    resumeField: TResumeField;
    resumeInitial: TResume;
    source: PlaybackSource;
    updateResumeOnSeek: (
        state: AbsPlaybackCoreState & TExtra,
        position: number,
    ) => null | { key: string; position: number };
}

type AbsStoreGet<TState> = () => TState;

type AbsStoreSet<TState> = (
    partial: ((state: TState) => Partial<TState>) | Partial<TState>,
) => void;

const isPlayingForSync = () => usePlayerStoreBase.getState().player.status === PlayerStatus.PLAYING;

export function createAbsPlaybackStore<
    TResume extends object,
    TExtra extends object,
    TActions extends AbsPlaybackBaseActions,
    TResumeField extends keyof TResume & string,
>(
    config: CreateAbsPlaybackStoreConfig<TResume, TExtra, TActions, TResumeField>,
): AbsPlaybackStoreBundle<AbsPlaybackCoreState & TExtra & TResume, TActions> {
    let sync!: AbsPlaybackSyncHandle;

    type FullState = AbsPlaybackCoreState & TExtra & TResume & { actions: TActions };

    const useStore = create<FullState>()(
        subscribeWithSelector(
            persist(
                (set, get) => {
                    const getResumeMap = () => get()[config.resumeField] as TResume;

                    const flushCurrentResume = (current: AbsPlaybackCoreState & TExtra) => {
                        const key = config.getResumeKey(current);
                        if (!key) {
                            return;
                        }

                        set(
                            (state) =>
                                ({
                                    [config.resumeField]: {
                                        ...(state[config.resumeField] as TResume),
                                        [key]: current.position,
                                    },
                                }) as Partial<FullState>,
                        );
                    };

                    const baseActions: AbsPlaybackBaseActions = {
                        release: () => {
                            sync.bumpPlayRequest();
                            const state = get();
                            const key = config.getResumeKey(state);
                            if (key) {
                                set(
                                    (s) =>
                                        ({
                                            [config.resumeField]: {
                                                ...(s[config.resumeField] as TResume),
                                                [key]: state.position,
                                            },
                                        }) as Partial<FullState>,
                                );
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
                            } as Partial<FullState>);

                            sync.resetAfterClose();
                            usePlaybackOwnerStore.getState().release(config.source);
                        },

                        seekTo: (seconds) => {
                            const nextPosition = clampPosition(seconds, get().duration);
                            set({ position: nextPosition } as Partial<FullState>);
                            sync.setLastFlushedPosition(nextPosition);

                            const state = get();
                            const resumeUpdate = config.updateResumeOnSeek(state, nextPosition);
                            if (resumeUpdate && state.server && state.item) {
                                set(
                                    (s) =>
                                        ({
                                            [config.resumeField]: {
                                                ...(s[config.resumeField] as TResume),
                                                [resumeUpdate.key]: resumeUpdate.position,
                                            },
                                        }) as Partial<FullState>,
                                );
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
                            set({ error } as Partial<FullState>);
                        },

                        setPosition: (seconds) => {
                            const nextPosition = clampPosition(seconds, get().duration);
                            set({ position: nextPosition } as Partial<FullState>);

                            const drift = Math.abs(nextPosition - sync.getLastFlushedPosition());
                            if (drift >= POSITION_PERSIST_DEBOUNCE_S) {
                                const state = get();
                                const resumeUpdate = config.updateResumeOnSeek(state, nextPosition);
                                if (resumeUpdate) {
                                    set(
                                        (s) =>
                                            ({
                                                [config.resumeField]: {
                                                    ...(s[config.resumeField] as TResume),
                                                    [resumeUpdate.key]: nextPosition,
                                                },
                                            }) as Partial<FullState>,
                                    );
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

                    const play = async (...playArgs: unknown[]) => {
                        const requestId = sync.bumpPlayRequest();
                        const current = get();

                        config.onBeforePlay?.(current, set as AbsStoreSet<FullState>, getResumeMap);

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

                        const server = playArgs[0] as ServerListItemWithCredential;
                        const item = playArgs[1] as LongFormLibraryItem;
                        const episode = config.requiresEpisode
                            ? (playArgs[2] as LongFormPodcastEpisode)
                            : null;
                        const playbackMediaKey = episode
                            ? `${item.id}:${episode.id}`
                            : item.id;

                        usePlaybackOwnerStore.getState().claim(config.source, {
                            engine: 'web',
                            mediaKey: playbackMediaKey,
                        });
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
                        } as Partial<FullState>);

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
                                ...(result.episode !== undefined
                                    ? { episode: result.episode }
                                    : {}),
                                ...result.patch,
                            } as Partial<FullState>);

                            config.rememberSession({
                                episode: result.episode ?? episode,
                                item: result.item,
                                position: result.position,
                                server,
                            });

                            usePlayerStoreBase.getState().mediaPlay();
                        } catch (err) {
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
                            } as Partial<FullState>);

                            usePlaybackOwnerStore.getState().release(config.source);
                        }
                    };

                    const actions = config.extendActions({
                        base: baseActions,
                        get: get as AbsStoreGet<FullState>,
                        play,
                        set: set as AbsStoreSet<FullState>,
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
                    } as FullState;
                },
                {
                    migrate: identityPersistMigrate<TResume>,
                    name: config.persistName,
                    partialize: (state) =>
                        ({ [config.resumeField]: state[config.resumeField] }) as TResume,
                    version: PERSIST_VERSION_INITIAL,
                },
            ),
        ),
    );

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
            } as Partial<FullState>);
        },
        onLoseOwnership: () => {
            const state = useStore.getState();
            const key = config.getResumeKey(state);
            if (key) {
                useStore.setState(
                    (s) =>
                        ({
                            [config.resumeField]: {
                                ...(s[config.resumeField] as TResume),
                                [key]: state.position,
                            },
                        }) as Partial<FullState>,
                );
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

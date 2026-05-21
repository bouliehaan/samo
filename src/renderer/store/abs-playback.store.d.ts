import { type StoreApi, type UseBoundStore } from 'zustand';
import { type AbsPlaybackSyncHandle } from '/@/renderer/store/abs-playback-sync';
import type { PlaybackSource } from '/@/renderer/store/playback-owner.store';
import { AudiobookshelfLibraryItem, AudiobookshelfPodcastEpisode } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
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
    item: AudiobookshelfLibraryItem | null;
    position: number;
    server: null | ServerListItemWithCredential | null;
    sessionId: null | string;
}
type AbsStoreSet<TState> = (partial: Partial<TState> | ((state: TState) => Partial<TState>)) => void;
type AbsStoreGet<TState> = () => TState;
export interface AbsPlaySessionResult {
    contentUrl: string;
    duration: number;
    episode?: AudiobookshelfPodcastEpisode | null;
    item: AudiobookshelfLibraryItem;
    position: number;
    sessionId: string | null;
    patch?: Partial<AbsPlaybackCoreState>;
}
export interface CreateAbsPlaybackStoreConfig<TResume extends object, TExtra extends object, TActions extends AbsPlaybackBaseActions, TResumeField extends keyof TResume & string> {
    clearTransientExtra: () => TExtra;
    extendActions: (api: {
        base: AbsPlaybackBaseActions;
        get: AbsStoreGet<AbsPlaybackCoreState & TExtra & {
            actions: TActions;
        } & TResume>;
        play: (...playArgs: unknown[]) => Promise<void>;
        set: AbsStoreSet<AbsPlaybackCoreState & TExtra & {
            actions: TActions;
        } & TResume>;
        sync: AbsPlaybackSyncHandle;
    }) => TActions;
    failureToastLabel: string;
    getEpisodeForSync: (state: AbsPlaybackCoreState & TExtra) => AudiobookshelfPodcastEpisode | null;
    getLoadingSeed: (...playArgs: unknown[]) => Partial<AbsPlaybackCoreState & TExtra>;
    getResumeKey: (state: AbsPlaybackCoreState & TExtra) => string | null;
    initialExtra: TExtra;
    logLabel: string;
    onBeforePlay?: (current: AbsPlaybackCoreState & TExtra, set: AbsStoreSet<AbsPlaybackCoreState & TExtra & {
        actions: TActions;
    } & TResume>, getResumeMap: () => TResume) => void;
    onLoseOwnershipExtra?: (state: AbsPlaybackCoreState & TExtra) => void;
    persistName: string;
    playArgsLabel: string;
    recordRecent: (item: AudiobookshelfLibraryItem, serverId: string) => void;
    rememberSession: (args: {
        episode?: AudiobookshelfPodcastEpisode | null;
        item: AudiobookshelfLibraryItem;
        position?: number;
        server: ServerListItemWithCredential;
    }) => void;
    requiresEpisode: boolean;
    resolvePlaySession: (...playArgs: unknown[]) => Promise<AbsPlaySessionResult>;
    resumeField: TResumeField;
    resumeInitial: TResume;
    source: PlaybackSource;
    updateResumeOnSeek: (state: AbsPlaybackCoreState & TExtra, position: number) => {
        key: string;
        position: number;
    } | null;
}
export interface AbsPlaybackStoreBundle<TState extends AbsPlaybackCoreState & object, TActions extends AbsPlaybackBaseActions> {
    selectors: {
        useActions: () => TActions;
        useContentUrl: () => null | string;
        useDuration: () => number;
        useError: () => null | string;
        useIsLoading: () => boolean;
        useItem: () => AudiobookshelfLibraryItem | null;
        usePosition: () => number;
        useServer: () => null | ServerListItemWithCredential;
    };
    store: UseBoundStore<StoreApi<TState & {
        actions: TActions;
    }>>;
    sync: AbsPlaybackSyncHandle;
}
export declare function createAbsPlaybackStore<TResume extends object, TExtra extends object, TActions extends AbsPlaybackBaseActions, TResumeField extends keyof TResume & string>(config: CreateAbsPlaybackStoreConfig<TResume, TExtra, TActions, TResumeField>): AbsPlaybackStoreBundle<AbsPlaybackCoreState & TExtra & TResume, TActions>;
export {};

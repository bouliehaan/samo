import { type PlaybackEngine, type PlaybackSession, type PlaybackSource } from '@samo/core/playback';
export type { PlaybackEngine, PlaybackSession, PlaybackSource } from '@samo/core/playback';
interface PlaybackClaimOptions {
    engine?: PlaybackEngine;
    mediaKey?: null | string;
    replace?: boolean;
}
interface PlaybackOwnerState {
    claim: (source: PlaybackSource, options?: PlaybackClaimOptions) => PlaybackSession;
    release: (source: PlaybackSource) => void;
    session: PlaybackSession;
    source: null | PlaybackSource;
}
export declare const usePlaybackOwnerStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<PlaybackOwnerState>, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: PlaybackOwnerState, previousSelectedState: PlaybackOwnerState) => void): () => void;
        <U>(selector: (state: PlaybackOwnerState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}>;
export declare const usePlaybackSession: () => PlaybackSession;
export declare const usePlaybackSource: () => PlaybackSource | null;

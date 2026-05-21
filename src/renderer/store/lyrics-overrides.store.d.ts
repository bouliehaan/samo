import { LyricsOverride } from '/@/shared/types/domain-types';
export type LyricsOverrideEntry = {
    offsetMs?: number;
    override?: LyricsOverride;
    structuredIndex?: number;
    suppressed?: boolean;
    updatedAt: number;
};
interface LyricsOverridesState {
    actions: {
        clearOffset: (key: string) => void;
        clearOverride: (key: string) => void;
        clearSuppressed: (key: string) => void;
        setOffset: (key: string, offsetMs: number) => void;
        setOverride: (key: string, override: LyricsOverride) => void;
        setStructuredIndex: (key: string, index: number) => void;
        suppress: (key: string) => void;
    };
    entries: Record<string, LyricsOverrideEntry>;
}
export declare const useLyricsOverridesStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<Omit<Omit<Omit<import("zustand").StoreApi<LyricsOverridesState>, "setState" | "persist"> & {
    setState(partial: LyricsOverridesState | Partial<LyricsOverridesState> | ((state: LyricsOverridesState) => LyricsOverridesState | Partial<LyricsOverridesState>), replace?: false | undefined): unknown;
    setState(state: LyricsOverridesState | ((state: LyricsOverridesState) => LyricsOverridesState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<LyricsOverridesState, {
            entries: Record<string, LyricsOverrideEntry>;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: LyricsOverridesState) => void) => () => void;
        onFinishHydration: (fn: (state: LyricsOverridesState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<LyricsOverridesState, {
            entries: Record<string, LyricsOverrideEntry>;
        }, unknown>>;
    };
}, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: LyricsOverridesState, previousSelectedState: LyricsOverridesState) => void): () => void;
        <U>(selector: (state: LyricsOverridesState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}, "setState" | "devtools"> & {
    setState(partial: LyricsOverridesState | Partial<LyricsOverridesState> | ((state: LyricsOverridesState) => LyricsOverridesState | Partial<LyricsOverridesState>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(state: LyricsOverridesState | ((state: LyricsOverridesState) => LyricsOverridesState), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    devtools: {
        cleanup: () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: LyricsOverridesState | Partial<LyricsOverridesState> | ((state: import("immer").WritableDraft<LyricsOverridesState>) => void), shouldReplace?: false, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(nextStateOrUpdater: LyricsOverridesState | ((state: import("immer").WritableDraft<LyricsOverridesState>) => void), shouldReplace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
}>;
export declare const lyricsKey: (serverId: string | undefined, songId: string | undefined) => string | null;
export declare const useLyricsOverrideEntry: (key: null | string) => LyricsOverrideEntry | undefined;
export declare const useLyricsOverridesActions: () => {
    clearOffset: (key: string) => void;
    clearOverride: (key: string) => void;
    clearSuppressed: (key: string) => void;
    setOffset: (key: string, offsetMs: number) => void;
    setOverride: (key: string, override: LyricsOverride) => void;
    setStructuredIndex: (key: string, index: number) => void;
    suppress: (key: string) => void;
};
export {};

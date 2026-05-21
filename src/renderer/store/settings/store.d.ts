import type { SettingsSlice } from './schemas';
export declare const SETTINGS_STORE_VERSION = 33;
export declare const useSettingsStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<Omit<Omit<Omit<import("zustand").StoreApi<SettingsSlice>, "setState" | "persist"> & {
    setState(partial: SettingsSlice | Partial<SettingsSlice> | ((state: SettingsSlice) => SettingsSlice | Partial<SettingsSlice>), replace?: false | undefined): unknown;
    setState(state: SettingsSlice | ((state: SettingsSlice) => SettingsSlice), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SettingsSlice, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SettingsSlice) => void) => () => void;
        onFinishHydration: (fn: (state: SettingsSlice) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SettingsSlice, unknown, unknown>>;
    };
}, "setState" | "devtools"> & {
    setState(partial: SettingsSlice | Partial<SettingsSlice> | ((state: SettingsSlice) => SettingsSlice | Partial<SettingsSlice>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(state: SettingsSlice | ((state: SettingsSlice) => SettingsSlice), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    devtools: {
        cleanup: () => void;
    };
}, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: SettingsSlice, previousSelectedState: SettingsSlice) => void): () => void;
        <U>(selector: (state: SettingsSlice) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: SettingsSlice | Partial<SettingsSlice> | ((state: import("immer").WritableDraft<SettingsSlice>) => void), shouldReplace?: false, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(nextStateOrUpdater: SettingsSlice | ((state: import("immer").WritableDraft<SettingsSlice>) => void), shouldReplace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
}>;

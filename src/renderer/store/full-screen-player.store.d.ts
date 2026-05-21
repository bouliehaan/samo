export interface FullScreenPlayerSlice extends FullScreenPlayerState {
    actions: {
        setStore: (data: Partial<FullScreenPlayerSlice>) => void;
    };
}
interface FullScreenPlayerState {
    activeTab: 'lyrics' | 'queue' | 'related' | string;
    dynamicBackground?: boolean;
    dynamicImageBlur: number;
    dynamicIsImage?: boolean;
    expanded: boolean;
    opacity: number;
    useImageAspectRatio: boolean;
    visualizerExpanded: boolean;
}
export declare const useFullScreenPlayerStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<Omit<Omit<import("zustand").StoreApi<FullScreenPlayerSlice>, "setState" | "persist"> & {
    setState(partial: FullScreenPlayerSlice | Partial<FullScreenPlayerSlice> | ((state: FullScreenPlayerSlice) => FullScreenPlayerSlice | Partial<FullScreenPlayerSlice>), replace?: false | undefined): unknown;
    setState(state: FullScreenPlayerSlice | ((state: FullScreenPlayerSlice) => FullScreenPlayerSlice), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<FullScreenPlayerSlice, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: FullScreenPlayerSlice) => void) => () => void;
        onFinishHydration: (fn: (state: FullScreenPlayerSlice) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<FullScreenPlayerSlice, unknown, unknown>>;
    };
}, "setState" | "devtools"> & {
    setState(partial: FullScreenPlayerSlice | Partial<FullScreenPlayerSlice> | ((state: FullScreenPlayerSlice) => FullScreenPlayerSlice | Partial<FullScreenPlayerSlice>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(state: FullScreenPlayerSlice | ((state: FullScreenPlayerSlice) => FullScreenPlayerSlice), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    devtools: {
        cleanup: () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: FullScreenPlayerSlice | Partial<FullScreenPlayerSlice> | ((state: import("immer").WritableDraft<FullScreenPlayerSlice>) => void), shouldReplace?: false, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(nextStateOrUpdater: FullScreenPlayerSlice | ((state: import("immer").WritableDraft<FullScreenPlayerSlice>) => void), shouldReplace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
}>;
export declare const useFullScreenPlayerStoreActions: () => {
    setStore: (data: Partial<FullScreenPlayerSlice>) => void;
};
export declare const useSetFullScreenPlayerStore: () => (data: Partial<FullScreenPlayerSlice>) => void;
export declare const useFullScreenPlayerOverlayState: () => {
    expanded: boolean;
    visualizerExpanded: boolean;
};
export {};

import { InternetRadioStation } from '/@/shared/types/domain-types';
export interface RadioStoreSlice extends RadioStoreState {
    actions: {
        createStation: (serverId: string, station: Omit<InternetRadioStation, 'id'>) => InternetRadioStation;
        deleteStation: (serverId: string, stationId: string) => void;
        getStation: (serverId: string, stationId: string) => InternetRadioStation | null;
        getStations: (serverId: string) => InternetRadioStation[];
        updateStation: (serverId: string, stationId: string, updates: Partial<InternetRadioStation>) => void;
    };
}
export interface RadioStoreState {
    stations: Record<string, Record<string, InternetRadioStation>>;
}
export declare const useRadioStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<Omit<Omit<import("zustand").StoreApi<RadioStoreSlice>, "setState" | "persist"> & {
    setState(partial: RadioStoreSlice | Partial<RadioStoreSlice> | ((state: RadioStoreSlice) => RadioStoreSlice | Partial<RadioStoreSlice>), replace?: false | undefined): unknown;
    setState(state: RadioStoreSlice | ((state: RadioStoreSlice) => RadioStoreSlice), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<RadioStoreSlice, Pick<RadioStoreState, "stations">, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: RadioStoreSlice) => void) => () => void;
        onFinishHydration: (fn: (state: RadioStoreSlice) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<RadioStoreSlice, Pick<RadioStoreState, "stations">, unknown>>;
    };
}, "setState" | "devtools"> & {
    setState(partial: RadioStoreSlice | Partial<RadioStoreSlice> | ((state: RadioStoreSlice) => RadioStoreSlice | Partial<RadioStoreSlice>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(state: RadioStoreSlice | ((state: RadioStoreSlice) => RadioStoreSlice), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    devtools: {
        cleanup: () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: RadioStoreSlice | Partial<RadioStoreSlice> | ((state: import("immer").WritableDraft<RadioStoreSlice>) => void), shouldReplace?: false, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(nextStateOrUpdater: RadioStoreSlice | ((state: import("immer").WritableDraft<RadioStoreSlice>) => void), shouldReplace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
}>;
export declare const useRadioStoreActions: () => {
    createStation: (serverId: string, station: Omit<InternetRadioStation, "id">) => InternetRadioStation;
    deleteStation: (serverId: string, stationId: string) => void;
    getStation: (serverId: string, stationId: string) => InternetRadioStation | null;
    getStations: (serverId: string) => InternetRadioStation[];
    updateStation: (serverId: string, stationId: string, updates: Partial<InternetRadioStation>) => void;
};
export declare const useRadioStations: (serverId: string) => InternetRadioStation[];
export declare const useRadioStation: (serverId: string, stationId: string) => InternetRadioStation;

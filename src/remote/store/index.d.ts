import { ClientEvent, SongUpdateSocket } from '/@/shared/types/remote-types';
export interface SettingsSlice extends SettingsState {
    actions: {
        reconnect: () => void;
        send: (data: ClientEvent) => void;
        toggleIsDark: () => void;
        toggleShowImage: () => void;
    };
}
interface SettingsState {
    connected: boolean;
    info: Omit<SongUpdateSocket, 'currentTime'>;
    isDark: boolean;
    showImage: boolean;
    socket?: StatefulWebSocket;
}
interface StatefulWebSocket extends WebSocket {
    natural: boolean;
}
export declare const useRemoteStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<Omit<Omit<import("zustand").StoreApi<SettingsSlice>, "setState" | "persist"> & {
    setState(partial: SettingsSlice | Partial<SettingsSlice> | ((state: SettingsSlice) => SettingsSlice | Partial<SettingsSlice>), replace?: false | undefined): unknown;
    setState(state: SettingsSlice | ((state: SettingsSlice) => SettingsSlice), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SettingsSlice, SettingsSlice, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SettingsSlice) => void) => () => void;
        onFinishHydration: (fn: (state: SettingsSlice) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SettingsSlice, SettingsSlice, unknown>>;
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
export declare const useConnected: () => boolean;
export declare const useInfo: () => Omit<SongUpdateSocket, "currentTime">;
export declare const useIsDark: () => boolean;
export declare const useReconnect: () => () => void;
export declare const useShowImage: () => boolean;
export declare const useSend: () => (data: ClientEvent) => void;
export declare const useToggleDark: () => () => void;
export declare const useToggleShowImage: () => () => void;
export {};

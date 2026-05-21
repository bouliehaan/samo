import { ServerListItem, ServerListItemWithCredential } from '/@/shared/types/domain-types';
export interface AuthSlice extends AuthState {
    actions: {
        addServer: (args: ServerListItemWithCredential) => void;
        clearActiveServer: (id: string) => void;
        deleteServer: (id: string) => void;
        getServer: (id: string) => null | ServerListItemWithCredential;
        setActiveAudiobookshelfServer: (server: null | ServerListItemWithCredential) => void;
        setActiveMusicServer: (server: null | ServerListItemWithCredential) => void;
        setCurrentServer: (server: null | ServerListItemWithCredential) => void;
        setMusicFolderId: (musicFolderId: string[] | undefined) => void;
        updateServer: (id: string, args: Partial<ServerListItemWithCredential>) => void;
    };
}
export interface AuthState {
    activeAudiobookshelfServerId: null | string;
    activeMusicServerId: null | string;
    currentServer: null | ServerListItemWithCredential;
    deviceId: string;
    hydrated: boolean;
    serverList: Record<string, ServerListItemWithCredential>;
}
export declare const getActiveMusicServer: (state: AuthState) => import("@samo/core").ServerListItemWithCredentialCore | null;
export declare const getAudiobookshelfServers: (state: AuthState) => import("@samo/core").ServerListItemWithCredentialCore[];
export declare const getPrimaryAudiobookshelfServer: (state: AuthState) => import("@samo/core").ServerListItemWithCredentialCore;
export declare const useAuthStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<Omit<Omit<import("zustand").StoreApi<AuthSlice>, "setState" | "persist"> & {
    setState(partial: AuthSlice | Partial<AuthSlice> | ((state: AuthSlice) => AuthSlice | Partial<AuthSlice>), replace?: false | undefined): unknown;
    setState(state: AuthSlice | ((state: AuthSlice) => AuthSlice), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AuthSlice, Partial<AuthState>, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AuthSlice) => void) => () => void;
        onFinishHydration: (fn: (state: AuthSlice) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AuthSlice, Partial<AuthState>, unknown>>;
    };
}, "setState" | "devtools"> & {
    setState(partial: AuthSlice | Partial<AuthSlice> | ((state: AuthSlice) => AuthSlice | Partial<AuthSlice>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(state: AuthSlice | ((state: AuthSlice) => AuthSlice), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    devtools: {
        cleanup: () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: AuthSlice | Partial<AuthSlice> | ((state: import("immer").WritableDraft<AuthSlice>) => void), shouldReplace?: false, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(nextStateOrUpdater: AuthSlice | ((state: import("immer").WritableDraft<AuthSlice>) => void), shouldReplace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
}>;
export declare const useCurrentServerId: () => string;
export declare const useCurrentServer: () => ServerListItem;
export declare const useIsAdmin: () => {
    isAdmin: boolean;
    userId: string | null | undefined;
};
export declare const useCurrentServerWithCredential: () => null | ServerListItemWithCredential;
export declare const useAudiobookshelfServers: () => import("@samo/core").ServerListItemWithCredentialCore[];
export declare const useAudiobookshelfServer: () => import("@samo/core").ServerListItemWithCredentialCore;
export declare const useServerList: () => Record<string, import("@samo/core").ServerListItemWithCredentialCore>;
export declare const useAuthHydrated: () => boolean;
export declare const useAuthStoreActions: () => {
    addServer: (args: ServerListItemWithCredential) => void;
    clearActiveServer: (id: string) => void;
    deleteServer: (id: string) => void;
    getServer: (id: string) => null | ServerListItemWithCredential;
    setActiveAudiobookshelfServer: (server: null | ServerListItemWithCredential) => void;
    setActiveMusicServer: (server: null | ServerListItemWithCredential) => void;
    setCurrentServer: (server: null | ServerListItemWithCredential) => void;
    setMusicFolderId: (musicFolderId: string[] | undefined) => void;
    updateServer: (id: string, args: Partial<ServerListItemWithCredential>) => void;
};
export declare const getServerById: (id?: string) => import("@samo/core").ServerListItemWithCredentialCore | null;
export declare const usePermissions: () => {
    playlists: {
        editOwner: boolean;
        editPublic: boolean;
    };
    radio: {
        create: boolean;
        delete: boolean;
        edit: boolean;
    };
    userId: string | null | undefined;
};

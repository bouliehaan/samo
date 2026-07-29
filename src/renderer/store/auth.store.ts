import { normalizeBaseUrl } from '@samo/core/server';
import merge from 'lodash/merge';
import { nanoid } from 'nanoid/non-secure';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';

import { createSubscribedTraditionalStore } from '/@/renderer/lib/zustand-traditional';
import { authPersistStorage } from '/@/renderer/store/auth-persist-storage';
import {
    ServerListItem,
    ServerListItemWithCredential,
    ServerType,
} from '/@/shared/types/domain-types';

export interface AuthSlice extends AuthState {
    actions: {
        addServer: (args: ServerListItemWithCredential) => void;
        clearActiveServer: (id: string) => void;
        deleteServer: (id: string) => void;
        ensureActiveServers: () => void;
        getServer: (id: string) => null | ServerListItemWithCredential;
        setActiveMusicServer: (server: null | ServerListItemWithCredential) => void;
        setCurrentServer: (server: null | ServerListItemWithCredential) => void;
        setMusicFolderId: (musicFolderId: string[] | undefined) => void;
        updateServer: (id: string, args: Partial<ServerListItemWithCredential>) => void;
    };
}

export interface AuthState {
    activeMusicServerId: null | string;
    currentServer: null | ServerListItemWithCredential;
    deviceId: string;
    hydrated: boolean;
    serverList: Record<string, ServerListItemWithCredential>;
}

const MUSIC_SERVER_TYPES = new Set<ServerType>([ServerType.SAMO]);

const isMusicServer = (
    server: null | ServerListItemWithCredential | undefined,
): server is ServerListItemWithCredential => Boolean(server && MUSIC_SERVER_TYPES.has(server.type));

const hasConfiguredServerUrl = (server: ServerListItemWithCredential | undefined) =>
    Boolean(server?.url && normalizeBaseUrl(server.url));

const sanitizeServerList = (
    serverList: Record<string, ServerListItemWithCredential> | undefined,
) => {
    const entries = Object.entries(serverList ?? {}).filter(([, server]) =>
        hasConfiguredServerUrl(server),
    );

    return Object.fromEntries(entries);
};

export const getActiveMusicServer = (state: AuthState) => {
    const serverList = state.serverList ?? {};
    const activeServer = state.activeMusicServerId ? serverList[state.activeMusicServerId] : null;

    if (isMusicServer(activeServer)) {
        return activeServer;
    }

    if (isMusicServer(state.currentServer)) {
        return state.currentServer;
    }

    return Object.values(serverList).find(isMusicServer) ?? null;
};

export const getConfiguredMusicServer = (state: AuthState) => {
    const serverList = state.serverList ?? {};
    const activeServer = getActiveMusicServer(state);

    if (activeServer?.credential && hasConfiguredServerUrl(activeServer)) {
        return activeServer;
    }

    return (
        Object.values(serverList).find(
            (server) =>
                isMusicServer(server) &&
                Boolean(server.credential) &&
                hasConfiguredServerUrl(server),
        ) ?? null
    );
};

/** Samo serves music + audiobooks + podcasts from one connection (like mobile). */
export const getLongFormMediaServer = (state: AuthState): null | ServerListItemWithCredential => {
    const musicServer = getConfiguredMusicServer(state);

    if (musicServer?.type === ServerType.SAMO) {
        return musicServer;
    }

    return null;
};

const getFallbackActiveServerIds = (state: Partial<AuthState>) => {
    const serverList = state.serverList ?? {};
    const servers = Object.values(serverList);
    const currentServer = state.currentServer ?? null;
    const fallbackMusicServer =
        (isMusicServer(currentServer) ? currentServer : null) ??
        servers.find(isMusicServer) ??
        null;

    return {
        activeMusicServerId: state.activeMusicServerId ?? fallbackMusicServer?.id ?? null,
        currentServer:
            currentServer ??
            fallbackMusicServer ??
            (state.activeMusicServerId ? serverList[state.activeMusicServerId] : null) ??
            null,
    };
};

export const useAuthStore = createSubscribedTraditionalStore<AuthSlice>()(
    persist(
        devtools(
            immer((set, get) => ({
                actions: {
                    addServer: (args) => {
                        set((state) => {
                            if (!hasConfiguredServerUrl(args)) {
                                return;
                            }

                            if (!state.serverList) {
                                state.serverList = {};
                            }

                            state.serverList[args.id] = args;

                            if (isMusicServer(args)) {
                                state.activeMusicServerId = args.id;
                                state.currentServer = args;
                            }
                        });
                    },
                    clearActiveServer: (id) => {
                        set((state) => {
                            if (state.activeMusicServerId === id) {
                                state.activeMusicServerId = null;
                            }

                            if (state.currentServer?.id === id) {
                                state.currentServer = null;
                            }
                        });
                    },
                    deleteServer: (id) => {
                        set((state) => {
                            delete state.serverList[id];

                            if (state.activeMusicServerId === id) {
                                state.activeMusicServerId = null;
                            }

                            if (state.currentServer?.id === id) {
                                state.currentServer = null;
                            }
                        });
                    },
                    ensureActiveServers: () => {
                        set((state) => {
                            const configuredServer = getConfiguredMusicServer(state);

                            if (!configuredServer) {
                                return;
                            }

                            state.activeMusicServerId = configuredServer.id;
                            state.currentServer = configuredServer;
                        });
                    },
                    getServer: (id) => {
                        const server = get().serverList[id];
                        if (server) return server;
                        return null;
                    },
                    setActiveMusicServer: (server) => {
                        set((state) => {
                            state.activeMusicServerId = isMusicServer(server) ? server.id : null;
                            state.currentServer = server;
                        });
                    },
                    setCurrentServer: (server) => {
                        set((state) => {
                            state.currentServer = server;

                            if (!server) {
                                return;
                            }

                            if (MUSIC_SERVER_TYPES.has(server.type)) {
                                state.activeMusicServerId = server.id;
                            }
                        });
                    },
                    setMusicFolderId: (musicFolderId: string[] | undefined) => {
                        set((state) => {
                            const activeMusicServer = getActiveMusicServer(state);

                            if (!activeMusicServer) {
                                return;
                            }

                            activeMusicServer.musicFolderId = musicFolderId;

                            const serverId = activeMusicServer.id;
                            if (state.serverList[serverId]) {
                                state.serverList[serverId].musicFolderId = musicFolderId;
                            }

                            if (state.currentServer?.id === serverId) {
                                state.currentServer.musicFolderId = musicFolderId;
                            }
                        });
                    },
                    updateServer: (id: string, args: Partial<ServerListItemWithCredential>) => {
                        set((state) => {
                            const updatedServer = {
                                ...state.serverList[id],
                                ...args,
                            };

                            if (
                                state.currentServer?.id === id &&
                                !('musicFolderId' in args) &&
                                state.currentServer.musicFolderId !== undefined
                            ) {
                                updatedServer.musicFolderId = state.currentServer.musicFolderId;
                            }

                            state.serverList[id] = updatedServer;
                            if (state.currentServer?.id === id) {
                                state.currentServer = updatedServer;
                            }
                        });
                    },
                },
                activeMusicServerId: null,
                currentServer: null,
                deviceId: nanoid(),
                hydrated: false,
                serverList: {},
            })),
            { name: 'store_authentication' },
        ),
        {
            merge: (persistedState, currentState) => {
                const persisted = (persistedState ?? {}) as Partial<AuthSlice>;
                const {
                    actions: _persistedActions,
                    hydrated: _persistedHydrated,
                    ...persistedData
                } = persisted;

                const merged = {
                    ...merge({}, currentState, persistedData),
                    actions: currentState.actions,
                    hydrated: true,
                    serverList: sanitizeServerList(
                        persistedData.serverList ?? currentState.serverList,
                    ),
                };

                const withActiveServers = {
                    ...merged,
                    ...getFallbackActiveServerIds(merged),
                };

                if (
                    withActiveServers.currentServer &&
                    !hasConfiguredServerUrl(withActiveServers.currentServer)
                ) {
                    withActiveServers.currentServer = null;
                }

                return withActiveServers;
            },
            migrate: (persistedState, version) => {
                const state = persistedState as Partial<AuthState>;

                if (version < 7) {
                    return {
                        ...state,
                        ...getFallbackActiveServerIds(state),
                    };
                }

                return state;
            },
            name: 'store_authentication',
            partialize: (state) => {
                const stateToPersist = { ...state };
                delete (stateToPersist as Partial<AuthSlice>).actions;
                delete (stateToPersist as Partial<AuthSlice>).hydrated;
                return stateToPersist;
            },
            storage: createJSONStorage(() => authPersistStorage),
            version: 7,
        },
    ),
);

export const useCurrentServerId = (): string =>
    useAuthStore((state) => {
        const currentServer = getConfiguredMusicServer(state);

        if (!currentServer) {
            return '';
        }

        return currentServer.id;
    }, shallow);

export const useCurrentServer = () =>
    useAuthStore((state) => {
        const currentServer = getConfiguredMusicServer(state);

        if (!currentServer) {
            return null;
        }

        return {
            id: currentServer.id,
            isAdmin: currentServer.isAdmin,
            musicFolderId: currentServer.musicFolderId,
            name: currentServer.name,
            preferInstantMix: currentServer.preferInstantMix,
            preferRemoteUrl: currentServer.preferRemoteUrl,
            remoteUrl: currentServer.remoteUrl,
            savePassword: currentServer.savePassword,
            serverId: currentServer.serverId,
            type: currentServer.type,
            url: currentServer.url,
            userId: currentServer.userId,
            username: currentServer.username,
        };
    }, shallow) as ServerListItem;

export const useIsAdmin = () =>
    useAuthStore((state) => {
        const currentServer = getConfiguredMusicServer(state);

        return {
            isAdmin: currentServer?.isAdmin ?? false,
            userId: currentServer?.userId,
        };
    }, shallow);

export const useCurrentServerWithCredential = () =>
    useAuthStore((state) => getConfiguredMusicServer(state)) as null | ServerListItemWithCredential;

export const useLongFormMediaServer = () =>
    useAuthStore((state) => getLongFormMediaServer(state), shallow);

export const useServerList = () => useAuthStore((state) => state.serverList);

export const useAuthHydrated = () => useAuthStore((state) => state.hydrated);

export const useAuthStoreActions = () => useAuthStore((state) => state.actions);

export const getServerById = (id?: string) => {
    if (!id) {
        return null;
    }

    return useAuthStore.getState().actions.getServer(id);
};

export const usePermissions = () => {
    const { isAdmin, userId } = useIsAdmin();

    return {
        playlists: {
            editOwner: isAdmin,
            editPublic: isAdmin,
        },
        radio: {
            create: true,
            delete: isAdmin,
            edit: isAdmin,
        },
        userId: userId,
    };
};

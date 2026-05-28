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

const MUSIC_SERVER_TYPES = new Set<ServerType>([
    ServerType.JELLYFIN,
    ServerType.NAVIDROME,
    ServerType.SAMO,
    ServerType.SUBSONIC,
]);

const isMusicServer = (
    server: null | ServerListItemWithCredential | undefined,
): server is ServerListItemWithCredential => Boolean(server && MUSIC_SERVER_TYPES.has(server.type));

const isAudiobookshelfServer = (
    server: null | ServerListItemWithCredential | undefined,
): server is ServerListItemWithCredential => server?.type === ServerType.AUDIOBOOKSHELF;

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
    const activeServer = state.activeMusicServerId
        ? serverList[state.activeMusicServerId]
        : null;

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

export const getAudiobookshelfServers = (state: AuthState) =>
    Object.values(state.serverList ?? {}).filter(
        (server) => server.type === ServerType.AUDIOBOOKSHELF,
    );

export const getPrimaryAudiobookshelfServer = (state: AuthState) => {
    const serverList = state.serverList ?? {};
    const activeServer = state.activeAudiobookshelfServerId
        ? serverList[state.activeAudiobookshelfServerId]
        : null;

    if (isAudiobookshelfServer(activeServer)) {
        return activeServer;
    }

    if (isAudiobookshelfServer(state.currentServer)) {
        return state.currentServer;
    }

    return getAudiobookshelfServers(state)[0] ?? null;
};

/** Samo serves music + audiobooks + podcasts from one connection (like mobile). */
export const getLongFormMediaServer = (
    state: AuthState,
): null | ServerListItemWithCredential => {
    const musicServer = getConfiguredMusicServer(state);

    if (musicServer?.type === ServerType.SAMO) {
        return musicServer;
    }

    return getPrimaryAudiobookshelfServer(state);
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
        activeAudiobookshelfServerId:
            state.activeAudiobookshelfServerId ??
            (isAudiobookshelfServer(currentServer)
                ? currentServer.id
                : servers.find(isAudiobookshelfServer)?.id) ??
            null,
        activeMusicServerId:
            state.activeMusicServerId ?? fallbackMusicServer?.id ?? null,
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

                            if (
                                args.type === ServerType.AUDIOBOOKSHELF &&
                                !state.activeAudiobookshelfServerId
                            ) {
                                state.activeAudiobookshelfServerId = args.id;

                                if (!state.currentServer) {
                                    state.currentServer = args;
                                }
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
                    clearActiveServer: (id) => {
                        set((state) => {
                            if (state.activeMusicServerId === id) {
                                state.activeMusicServerId = null;
                            }

                            if (state.activeAudiobookshelfServerId === id) {
                                state.activeAudiobookshelfServerId = null;
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

                            if (state.activeAudiobookshelfServerId === id) {
                                state.activeAudiobookshelfServerId = null;
                            }

                            if (state.currentServer?.id === id) {
                                state.currentServer = null;
                            }
                        });
                    },
                    getServer: (id) => {
                        const server = get().serverList[id];
                        if (server) return server;
                        return null;
                    },
                    setActiveAudiobookshelfServer: (server) => {
                        set((state) => {
                            state.activeAudiobookshelfServerId = isAudiobookshelfServer(server)
                                ? server.id
                                : null;
                            state.currentServer = server;
                        });
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
                            } else if (server.type === ServerType.AUDIOBOOKSHELF) {
                                state.activeAudiobookshelfServerId = server.id;
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
                activeAudiobookshelfServerId: null,
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
            features: currentServer.features,
            id: currentServer.id,
            isAdmin: currentServer.isAdmin,
            musicFolderId: currentServer.musicFolderId,
            name: currentServer.name,
            preferInstantMix: currentServer.preferInstantMix,
            preferRemoteUrl: currentServer.preferRemoteUrl,
            remoteUrl: currentServer.remoteUrl,
            savePassword: currentServer.savePassword,
            type: currentServer.type,
            url: currentServer.url,
            userId: currentServer.userId,
            username: currentServer.username,
            version: currentServer.version,
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

export const useAudiobookshelfServers = () =>
    useAuthStore((state) => getAudiobookshelfServers(state), shallow);

export const useAudiobookshelfServer = () =>
    useAuthStore((state) => getPrimaryAudiobookshelfServer(state), shallow);

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

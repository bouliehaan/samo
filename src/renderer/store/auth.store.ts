import merge from 'lodash/merge';
import { nanoid } from 'nanoid/non-secure';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import {
    ServerListItem,
    ServerListItemWithCredential,
    ServerType,
} from '/@/shared/types/domain-types';

export interface AuthSlice extends AuthState {
    actions: {
        addServer: (args: ServerListItemWithCredential) => void;
        deleteServer: (id: string) => void;
        getServer: (id: string) => null | ServerListItemWithCredential;
        setCurrentServer: (server: null | ServerListItemWithCredential) => void;
        setMusicFolderId: (musicFolderId: string[] | undefined) => void;
        updateServer: (id: string, args: Partial<ServerListItemWithCredential>) => void;
    };
}

export interface AuthState {
    currentServer: null | ServerListItemWithCredential;
    deviceId: string;
    serverList: Record<string, ServerListItemWithCredential>;
}

const MUSIC_SERVER_TYPES = new Set<ServerType>([
    ServerType.JELLYFIN,
    ServerType.NAVIDROME,
    ServerType.SUBSONIC,
]);

const isMusicServer = (server: null | ServerListItemWithCredential | undefined) =>
    Boolean(server && MUSIC_SERVER_TYPES.has(server.type));

export const getActiveMusicServer = (state: AuthState) => {
    if (isMusicServer(state.currentServer)) {
        return state.currentServer;
    }

    return Object.values(state.serverList).find(isMusicServer) ?? null;
};

export const getAudiobookshelfServers = (state: AuthState) =>
    Object.values(state.serverList).filter((server) => server.type === ServerType.AUDIOBOOKSHELF);

export const getPrimaryAudiobookshelfServer = (state: AuthState) =>
    getAudiobookshelfServers(state)[0] ?? null;

export const useAuthStore = createWithEqualityFn<AuthSlice>()(
    persist(
        devtools(
            immer((set, get) => ({
                actions: {
                    addServer: (args) => {
                        set((state) => {
                            state.serverList[args.id] = args;
                        });
                    },
                    deleteServer: (id) => {
                        set((state) => {
                            delete state.serverList[id];

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
                    setCurrentServer: (server) => {
                        set((state) => {
                            state.currentServer = server;
                        });
                    },
                    setMusicFolderId: (musicFolderId: string[] | undefined) => {
                        set((state) => {
                            if (state.currentServer) {
                                state.currentServer.musicFolderId = musicFolderId;
                                const serverId = state.currentServer.id;
                                if (state.serverList[serverId]) {
                                    state.serverList[serverId].musicFolderId = musicFolderId;
                                }
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
                currentServer: null,
                deviceId: nanoid(),
                serverList: {},
            })),
            { name: 'store_authentication' },
        ),
        {
            merge: (persistedState, currentState) => merge(currentState, persistedState),
            name: 'store_authentication',
            version: 2,
        },
    ),
);

export const useCurrentServerId = (): string =>
    useAuthStore((state) => {
        const currentServer = getActiveMusicServer(state);

        if (!currentServer) {
            return '';
        }

        return currentServer.id;
    }, shallow);

export const useCurrentServer = () =>
    useAuthStore((state) => {
        const currentServer = getActiveMusicServer(state);

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
        return {
            isAdmin: state.currentServer?.isAdmin ?? false,
            userId: state.currentServer?.userId,
        };
    }, shallow);

export const useCurrentServerWithCredential = () =>
    useAuthStore((state) => getActiveMusicServer(state)) as ServerListItemWithCredential;

export const useAudiobookshelfServers = () =>
    useAuthStore((state) => getAudiobookshelfServers(state), shallow);

export const useAudiobookshelfServer = () =>
    useAuthStore((state) => getPrimaryAudiobookshelfServer(state), shallow);

export const useServerList = () => useAuthStore((state) => state.serverList);

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

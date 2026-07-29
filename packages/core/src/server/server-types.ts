export enum ServerType {
    SAMO = 'samo',
}

export interface ServerListItemCore {
    id: string;
    isAdmin?: boolean;
    musicFolderId?: string[];
    name: string;
    preferInstantMix?: boolean;
    preferRemoteUrl?: boolean;
    remoteUrl?: string;
    savePassword?: boolean;
    /** Stable identity issued by the server. Lets the client verify that an
     *  address it is about to use really is this server. */
    serverId?: string;
    type: ServerType;
    url: string;
    userId: null | string;
    username: string;
}

export type ServerListItemWithCredentialCore = ServerListItemCore & {
    credential: string;
};

export const toServerType = (value?: string): null | ServerType => {
    switch (value?.toLowerCase()) {
        case ServerType.SAMO:
            return ServerType.SAMO;
        default:
            return null;
    }
};

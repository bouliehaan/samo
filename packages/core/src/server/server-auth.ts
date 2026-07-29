import { type ServerCapabilities } from './server-capabilities';
import { type SamoFetch } from './server-http';
import { authenticateSamo } from './server-samo';
import { ServerType } from './server-types';

export enum ServerAuthenticationKind {
    SAMO_TOKEN = 'samo-token',
}

export interface ServerAuthenticationInput {
    deviceLabel?: string;
    fetch?: SamoFetch;
    password: string;
    type: ServerType;
    url: string;
    username: string;
}

export interface ServerAuthenticationResult {
    capabilities: ServerCapabilities;
    /** The key this connection's local state is stored under. Pinned once and
     *  carried forward verbatim — see getServerConnectionKey. */
    connectionKey?: string;
    credential: string;
    details: string;
    isAdmin?: boolean;
    kind: ServerAuthenticationKind;
    /** Stable identity issued by the server. Preferred over `url` when keying
     *  local state, so the server's address can change without orphaning it. */
    serverId?: string;
    serverVersion?: string;
    title: string;
    type: ServerType;
    url: string;
    userId?: string;
    username: string;
}


export const getServerAuthenticationErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Connection failed';
};

export const authenticateServerConnection = async (
    input: ServerAuthenticationInput,
): Promise<ServerAuthenticationResult> => {
    return authenticateSamo(input);
};

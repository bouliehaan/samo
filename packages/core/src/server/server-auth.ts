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
    credential: string;
    details: string;
    isAdmin?: boolean;
    kind: ServerAuthenticationKind;
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
    if (input.type === ServerType.SAMO) {
        return authenticateSamo(input);
    }

    throw new Error(`Authentication is not supported for server type "${input.type}"`);
};

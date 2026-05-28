import { type ServerCapabilities } from './server-capabilities';
import { type SamoFetch } from './server-http';
import { ServerType } from './server-types';
export declare enum ServerAuthenticationKind {
    AUDIOBOOKSHELF_TOKEN = "audiobookshelf-token",
    NAVIDROME_TOKEN = "navidrome-token",
    SAMO_TOKEN = "samo-token",
    SUBSONIC_LEGACY_PASSWORD = "subsonic-legacy-password"
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
    ndCredential?: string;
    serverVersion?: string;
    title: string;
    type: ServerType;
    url: string;
    userId?: string;
    username: string;
}
export declare const getServerAuthenticationErrorMessage: (error: unknown) => string;
export declare const authenticateServerConnection: (input: ServerAuthenticationInput) => Promise<ServerAuthenticationResult>;

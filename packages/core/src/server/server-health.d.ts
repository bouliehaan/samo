import { type ServerAuthenticationResult } from './server-auth';
import { type SamoFetch } from './server-http';
export declare enum ServerConnectionHealthStatus {
    ERROR = "error",
    HEALTHY = "healthy",
    UNAUTHORIZED = "unauthorized",
    UNREACHABLE = "unreachable",
    UNSUPPORTED = "unsupported"
}
export interface ServerConnectionHealthInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    now?: () => number;
}
export interface ServerConnectionHealthResult {
    authentication: ServerAuthenticationResult;
    checkedAt: number;
    message: string;
    ok: boolean;
    status: ServerConnectionHealthStatus;
}
export declare const checkServerConnectionHealth: ({ authentication, fetch, now, }: ServerConnectionHealthInput) => Promise<ServerConnectionHealthResult>;

import { type ServerAuthenticationResult } from './server-auth';
import { ServerType } from './server-types';
export interface ServerAuthenticationParseResult {
    authentication: ServerAuthenticationResult | null;
    discardedCount: number;
    migratedLegacySingle: boolean;
}
export declare const getServerConnectionKey: (authentication: Pick<ServerAuthenticationResult, "type" | "url">) => string;
export declare const dedupeServerAuthentications: (authentication: ServerAuthenticationResult | null) => ServerAuthenticationResult[];
export declare const upsertServerAuthentication: (authentication: ServerAuthenticationResult | null, authentication: ServerAuthenticationResult) => ServerAuthenticationResult[];
export declare const removeServerAuthentication: (authentication: ServerAuthenticationResult | null, authentication: Pick<ServerAuthenticationResult, "type" | "url">) => ServerAuthenticationResult[];
export declare const parseServerAuthentications: (value: unknown) => ServerAuthenticationParseResult;
export declare const serializeServerAuthentications: (authentication: ServerAuthenticationResult | null) => string;
export declare const supportsServerTypeOnAndroid: (type: ServerType) => type is ServerType.AUDIOBOOKSHELF | ServerType.NAVIDROME | ServerType.SUBSONIC;

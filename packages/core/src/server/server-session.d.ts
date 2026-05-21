import { type ServerAuthenticationResult } from './server-auth';
import { ServerType } from './server-types';
export interface ServerAuthenticationParseResult {
    authentications: ServerAuthenticationResult[];
    discardedCount: number;
    migratedLegacySingle: boolean;
}
export declare const getServerConnectionKey: (authentication: Pick<ServerAuthenticationResult, "type" | "url">) => string;
export declare const dedupeServerAuthentications: (authentications: ServerAuthenticationResult[]) => ServerAuthenticationResult[];
export declare const upsertServerAuthentication: (authentications: ServerAuthenticationResult[], authentication: ServerAuthenticationResult) => ServerAuthenticationResult[];
export declare const removeServerAuthentication: (authentications: ServerAuthenticationResult[], authentication: Pick<ServerAuthenticationResult, "type" | "url">) => ServerAuthenticationResult[];
export declare const parseServerAuthentications: (value: unknown) => ServerAuthenticationParseResult;
export declare const serializeServerAuthentications: (authentications: ServerAuthenticationResult[]) => string;
export declare const supportsServerTypeOnAndroid: (type: ServerType) => type is ServerType.AUDIOBOOKSHELF | ServerType.NAVIDROME | ServerType.SUBSONIC;

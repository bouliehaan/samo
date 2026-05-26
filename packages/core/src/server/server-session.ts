import { ServerAuthenticationKind, type ServerAuthenticationResult } from './server-auth';
import { normalizeServerCapabilities } from './server-capabilities';
import { normalizeBaseUrl } from './server-http';
import { ServerType, toServerType } from './server-types';

export interface ServerContentSourceRef {
    id?: string;
    type?: ServerType;
    url?: string;
}

export interface ServerAuthenticationParseResult {
    authentications: ServerAuthenticationResult[];
    discardedCount: number;
    migratedLegacySingle: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const toAuthenticationKind = (value: unknown) => {
    return Object.values(ServerAuthenticationKind).includes(value as ServerAuthenticationKind)
        ? (value as ServerAuthenticationKind)
        : null;
};

export const getServerConnectionKey = (
    authentication: Pick<ServerAuthenticationResult, 'type' | 'url'>,
) => {
    return `${authentication.type}:${normalizeBaseUrl(authentication.url)}`;
};

export const normalizeServerContentSourceId = (sourceId: string) => {
    const separator = sourceId.indexOf(':');

    if (separator <= 0) {
        return sourceId;
    }

    const type = sourceId.slice(0, separator);
    const url = sourceId.slice(separator + 1);

    return `${type}:${normalizeBaseUrl(url)}`;
};

export const findServerAuthenticationForSource = (
    authentications: ServerAuthenticationResult[],
    source: ServerContentSourceRef | undefined,
) => {
    if (!source) {
        return undefined;
    }

    if (source.id) {
        const normalizedSourceId = normalizeServerContentSourceId(source.id);
        const match = authentications.find(
            (authentication) => getServerConnectionKey(authentication) === normalizedSourceId,
        );

        if (match) {
            return match;
        }
    }

    if (source.type && source.url) {
        const sourceType = source.type;
        const sourceUrl = source.url;

        return authentications.find(
            (authentication) =>
                authentication.type === sourceType &&
                getServerConnectionKey(authentication) ===
                    getServerConnectionKey({ type: sourceType, url: sourceUrl }),
        );
    }

    return undefined;
};

const normalizeAuthenticationResult = (value: unknown): null | ServerAuthenticationResult => {
    if (!isRecord(value)) {
        return null;
    }

    const type = toServerType(typeof value.type === 'string' ? value.type : undefined);
    const kind = toAuthenticationKind(value.kind);

    if (
        !type ||
        !kind ||
        typeof value.credential !== 'string' ||
        value.credential.length === 0 ||
        typeof value.title !== 'string' ||
        value.title.length === 0 ||
        typeof value.url !== 'string' ||
        value.url.length === 0 ||
        typeof value.username !== 'string' ||
        value.username.length === 0
    ) {
        return null;
    }

    return {
        capabilities: normalizeServerCapabilities(value.capabilities, type),
        credential: value.credential,
        details: typeof value.details === 'string' ? value.details : 'Saved session',
        isAdmin: typeof value.isAdmin === 'boolean' ? value.isAdmin : undefined,
        kind,
        ndCredential: typeof value.ndCredential === 'string' ? value.ndCredential : undefined,
        serverVersion: typeof value.serverVersion === 'string' ? value.serverVersion : undefined,
        title: value.title,
        type,
        url: normalizeBaseUrl(value.url),
        userId: typeof value.userId === 'string' ? value.userId : undefined,
        username: value.username,
    };
};

export const dedupeServerAuthentications = (authentications: ServerAuthenticationResult[]) => {
    const byKey = new Map<string, ServerAuthenticationResult>();

    authentications.forEach((authentication) => {
        byKey.set(getServerConnectionKey(authentication), authentication);
    });

    return [...byKey.values()];
};

export const upsertServerAuthentication = (
    authentications: ServerAuthenticationResult[],
    authentication: ServerAuthenticationResult,
) => {
    return dedupeServerAuthentications([...authentications, authentication]);
};

export const removeServerAuthentication = (
    authentications: ServerAuthenticationResult[],
    authentication: Pick<ServerAuthenticationResult, 'type' | 'url'>,
) => {
    const removeKey = getServerConnectionKey(authentication);

    return authentications.filter((candidate) => getServerConnectionKey(candidate) !== removeKey);
};

export const parseServerAuthentications = (value: unknown): ServerAuthenticationParseResult => {
    const values = Array.isArray(value) ? value : [value];
    const authentications = values.flatMap((candidate) => {
        const authentication = normalizeAuthenticationResult(candidate);

        return authentication ? [authentication] : [];
    });

    return {
        authentications: dedupeServerAuthentications(authentications),
        discardedCount: values.length - authentications.length,
        migratedLegacySingle: !Array.isArray(value) && authentications.length === 1,
    };
};

export const serializeServerAuthentications = (authentications: ServerAuthenticationResult[]) => {
    return JSON.stringify(dedupeServerAuthentications(authentications));
};

export const supportsServerTypeOnAndroid = (type: ServerType) => {
    return (
        type === ServerType.AUDIOBOOKSHELF ||
        type === ServerType.NAVIDROME ||
        type === ServerType.SAMO ||
        type === ServerType.SUBSONIC
    );
};

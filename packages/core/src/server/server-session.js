import { ServerAuthenticationKind } from './server-auth';
import { normalizeServerCapabilities } from './server-capabilities';
import { normalizeBaseUrl } from './server-http';
import { ServerType, toServerType } from './server-types';
const isRecord = (value) => {
    return typeof value === 'object' && value !== null;
};
const toAuthenticationKind = (value) => {
    return Object.values(ServerAuthenticationKind).includes(value)
        ? value
        : null;
};
export const getServerConnectionKey = (authentication) => {
    return `${authentication.type}:${normalizeBaseUrl(authentication.url)}`;
};
const normalizeAuthenticationResult = (value) => {
    if (!isRecord(value)) {
        return null;
    }
    const type = toServerType(typeof value.type === 'string' ? value.type : undefined);
    const kind = toAuthenticationKind(value.kind);
    if (!type ||
        !kind ||
        typeof value.credential !== 'string' ||
        value.credential.length === 0 ||
        typeof value.title !== 'string' ||
        value.title.length === 0 ||
        typeof value.url !== 'string' ||
        value.url.length === 0 ||
        typeof value.username !== 'string' ||
        value.username.length === 0) {
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
export const dedupeServerAuthentications = (authentications) => {
    const byKey = new Map();
    authentications.forEach((authentication) => {
        byKey.set(getServerConnectionKey(authentication), authentication);
    });
    return [...byKey.values()];
};
export const upsertServerAuthentication = (authentications, authentication) => {
    return dedupeServerAuthentications([...authentications, authentication]);
};
export const removeServerAuthentication = (authentications, authentication) => {
    const removeKey = getServerConnectionKey(authentication);
    return authentications.filter((candidate) => getServerConnectionKey(candidate) !== removeKey);
};
export const parseServerAuthentications = (value) => {
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
export const serializeServerAuthentications = (authentications) => {
    return JSON.stringify(dedupeServerAuthentications(authentications));
};
export const supportsServerTypeOnAndroid = (type) => {
    return (type === ServerType.AUDIOBOOKSHELF ||
        type === ServerType.NAVIDROME ||
        type === ServerType.SUBSONIC);
};

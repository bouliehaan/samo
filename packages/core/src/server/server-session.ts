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
    authentication: ServerAuthenticationResult | null;
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

/**
 * Derives the key a connection being seen for the *first* time should use.
 *
 * Prefers the server-issued identity, which leaves the address free to change:
 * the same server reached over a LAN IP and over a tunnel hostname derives the
 * same key. Falls back to the URL for servers predating identity support.
 */
export const deriveServerConnectionKey = (
    authentication: Pick<ServerAuthenticationResult, 'serverId' | 'type' | 'url'>,
) => {
    const serverId = authentication.serverId?.trim();

    return serverId
        ? `${authentication.type}:${serverId}`
        : `${authentication.type}:${normalizeBaseUrl(authentication.url)}`;
};

/**
 * The key this connection's local state — catalog mirror, downloads, playback
 * progress — is stored under.
 *
 * Returns the pinned key when there is one, and only derives a fresh key for a
 * connection that has never had one. That stickiness is the whole point: an
 * install created before servers issued identities keeps its URL-derived key
 * even after its server upgrades and starts issuing one, so upgrading never
 * re-keys, and therefore never orphans, data already on the device.
 */
export const getServerConnectionKey = (
    authentication: Pick<
        ServerAuthenticationResult,
        'connectionKey' | 'serverId' | 'type' | 'url'
    >,
) => {
    return authentication.connectionKey?.trim() || deriveServerConnectionKey(authentication);
};

/**
 * Whether two authentications describe the same server.
 *
 * Compares identities when both sides have one, which is what lets the same
 * server be recognised across a change of address. Falls back to comparing
 * addresses when either side predates identities — the best available signal,
 * and exactly what the client used before identities existed.
 */
export const isSameServer = (
    a: Pick<ServerAuthenticationResult, 'serverId' | 'url'>,
    b: Pick<ServerAuthenticationResult, 'serverId' | 'url'>,
) => {
    const aId = a.serverId?.trim();
    const bId = b.serverId?.trim();

    if (aId && bId) {
        return aId === bId;
    }

    return normalizeBaseUrl(a.url) === normalizeBaseUrl(b.url);
};

/**
 * Prepares a freshly authenticated result for persistence.
 *
 * Re-authenticating against a server the device already knows must keep that
 * server's existing key, or its catalog mirror and downloads stop resolving.
 * Authenticating against a genuinely different server must not inherit the old
 * key, or the two would collide. This decides which case applies.
 */
export const reconcileServerAuthentication = (
    next: ServerAuthenticationResult,
    previous?: null | ServerAuthenticationResult,
): ServerAuthenticationResult => {
    const carryForward = previous && isSameServer(next, previous) ? previous : null;

    return withPinnedConnectionKey(next, carryForward);
};

/**
 * Carries a previously pinned key onto a freshly authenticated result.
 *
 * Re-authentication produces a result built from the login response alone,
 * which has no memory of how this connection was keyed before. Without this,
 * the first login after a server starts issuing identities would silently
 * switch the key and strand every byte of local state.
 */
export const withPinnedConnectionKey = (
    next: ServerAuthenticationResult,
    previous?: null | Pick<ServerAuthenticationResult, 'connectionKey'>,
): ServerAuthenticationResult => {
    const pinned = previous?.connectionKey?.trim() || next.connectionKey?.trim();

    return { ...next, connectionKey: pinned || deriveServerConnectionKey(next) };
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
    authentication: ServerAuthenticationResult | null,
    source: ServerContentSourceRef | undefined,
) => {
    if (!source || !authentication) {
        return undefined;
    }

    if (source.id) {
        const normalizedSourceId = normalizeServerContentSourceId(source.id);

        // Match against every key this connection could legitimately be filed
        // under: the pinned one, and the URL- and identity-derived forms. A
        // source recorded before the server issued identities still resolves,
        // and so does one recorded after.
        const candidateKeys = new Set([
            deriveServerConnectionKey(authentication),
            deriveServerConnectionKey({ serverId: undefined, ...authentication }),
            getServerConnectionKey(authentication),
        ]);

        if (candidateKeys.has(normalizedSourceId)) {
            return authentication;
        }
    }

    if (source.type && source.url) {
        const sourceType = source.type;
        const sourceUrl = source.url;

        if (
            authentication.type === sourceType &&
            deriveServerConnectionKey({ serverId: undefined, ...authentication }) ===
                deriveServerConnectionKey({ serverId: undefined, type: sourceType, url: sourceUrl })
        ) {
            return authentication;
        }
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

    const url = normalizeBaseUrl(value.url);
    const serverId = typeof value.serverId === 'string' ? value.serverId.trim() : undefined;
    const storedKey = typeof value.connectionKey === 'string' ? value.connectionKey.trim() : '';

    return {
        capabilities: normalizeServerCapabilities(value.capabilities),
        // Sessions written before connection keys existed have none stored. Pin
        // the URL-derived key they have effectively been using all along, rather
        // than leaving it to be re-derived later from a serverId this install
        // never keyed by.
        connectionKey: storedKey || deriveServerConnectionKey({ serverId: undefined, type, url }),
        credential: value.credential,
        details: typeof value.details === 'string' ? value.details : 'Saved session',
        isAdmin: typeof value.isAdmin === 'boolean' ? value.isAdmin : undefined,
        kind,
        serverId: serverId || undefined,
        serverVersion: typeof value.serverVersion === 'string' ? value.serverVersion : undefined,
        title: value.title,
        type,
        url,
        userId: typeof value.userId === 'string' ? value.userId : undefined,
        username: value.username,
    };
};

export const parseServerAuthentication = (value: unknown): ServerAuthenticationParseResult => {
    const candidate = Array.isArray(value) ? value[0] : value;
    const authentication = normalizeAuthenticationResult(candidate);

    return {
        authentication: authentication,
        discardedCount: Array.isArray(value) && value.length > 1 ? value.length - 1 : 0,
        migratedLegacySingle: !Array.isArray(value) && authentication !== null,
    };
};

export const serializeServerAuthentication = (authentication: ServerAuthenticationResult | null) => {
    return JSON.stringify(authentication);
};


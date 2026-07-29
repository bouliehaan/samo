import { normalizeBaseUrl, type ServerAuthenticationResult } from '@samo/core/server';

import { getPersistedServerAuthKey } from './persisted-server';
import { fsGetItem, fsSetItem } from './fs-storage';
import { isLanServerUrl } from '../utils/auth-url';
import { safeParseJson } from '../utils/json';

/**
 * The addresses one server can be reached at, and the hint for choosing
 * between them.
 *
 * Kept OUT of the credential record on purpose. That record lives in
 * SecureStore behind a strict validator whose job is to refuse anything
 * malformed — a saved session that fails to parse logs the user out — and
 * these fields are neither secret nor worth risking a session over. They live
 * beside it, keyed the same way, and a missing profile simply means "one
 * address, the one you logged in with".
 */
export interface ServerEndpointProfile {
    /** Wi-Fi network on which the local address is the right one. Optional: the
     *  reachability probe decides on its own when this is absent. */
    homeSsid?: string;
    /**
     * Which address worked last time. Purely a latency optimisation — it is
     * tried first so the steady state is one fast probe instead of waiting out
     * a dropped-packet timeout on an address that is not on this network.
     */
    lastUsedKind?: 'local' | 'remote';
    /** LAN address. Fast and free when the device is on the same network. */
    localUrl?: string;
    /** Address that works from anywhere — a tunnel, a reverse proxy, a VPS. */
    remoteUrl?: string;
}

const KEY = 'samo.android.server-endpoints.v1';

type ProfileMap = Record<string, ServerEndpointProfile>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const readUrl = (value: unknown): string | undefined => {
    const url = typeof value === 'string' ? normalizeBaseUrl(value) : '';
    return url.length > 0 ? url : undefined;
};

const normalizeProfile = (value: unknown): ServerEndpointProfile | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }
    const homeSsid = typeof value.homeSsid === 'string' ? value.homeSsid.trim() : '';
    const lastUsedKind =
        value.lastUsedKind === 'local' || value.lastUsedKind === 'remote'
            ? value.lastUsedKind
            : undefined;
    const profile: ServerEndpointProfile = {
        ...(homeSsid ? { homeSsid } : {}),
        ...(lastUsedKind ? { lastUsedKind } : {}),
        ...(readUrl(value.localUrl) ? { localUrl: readUrl(value.localUrl) } : {}),
        ...(readUrl(value.remoteUrl) ? { remoteUrl: readUrl(value.remoteUrl) } : {}),
    };
    return profile;
};

// One in-memory copy, loaded once. Selection reads this on every network
// change and every foreground, and none of those should be waiting on a file.
let cache: ProfileMap | null = null;
let loading: Promise<ProfileMap> | null = null;

const loadAll = async (): Promise<ProfileMap> => {
    if (cache) {
        return cache;
    }
    if (!loading) {
        loading = (async () => {
            const raw = await fsGetItem(KEY);
            const parsed = raw ? safeParseJson<unknown>(raw) : null;
            const next: ProfileMap = {};
            if (isRecord(parsed)) {
                for (const [key, value] of Object.entries(parsed)) {
                    const profile = normalizeProfile(value);
                    if (profile) {
                        next[key] = profile;
                    }
                }
            }
            cache = next;
            return next;
        })();
    }
    return loading;
};

const persist = async (map: ProfileMap): Promise<void> => {
    cache = map;
    await fsSetItem(KEY, JSON.stringify(map));
};

/** Synchronous read for hot paths, valid once {@link loadEndpointProfiles} has
 *  resolved. Returns an empty profile rather than null so callers never branch. */
export const peekEndpointProfile = (
    authentication: null | ServerAuthenticationResult,
): ServerEndpointProfile => {
    if (!authentication || !cache) {
        return {};
    }
    return cache[getPersistedServerAuthKey(authentication)] ?? {};
};

export const loadEndpointProfiles = async (): Promise<void> => {
    await loadAll();
};

export const getEndpointProfile = async (
    authentication: ServerAuthenticationResult,
): Promise<ServerEndpointProfile> => {
    const all = await loadAll();
    return all[getPersistedServerAuthKey(authentication)] ?? {};
};

export const updateEndpointProfile = async (
    authentication: ServerAuthenticationResult,
    patch: Partial<ServerEndpointProfile>,
): Promise<ServerEndpointProfile> => {
    const all = await loadAll();
    const key = getPersistedServerAuthKey(authentication);
    const next: ServerEndpointProfile = { ...(all[key] ?? {}) };

    for (const [field, value] of Object.entries(patch) as Array<
        [keyof ServerEndpointProfile, string | undefined]
    >) {
        if (value === undefined || value.length === 0) {
            delete next[field];
        } else {
            // URLs are stored normalized so an accidental trailing slash can't
            // make the same address look like a different one.
            (next[field] as string) =
                field === 'localUrl' || field === 'remoteUrl'
                    ? normalizeBaseUrl(value)
                    : value.trim();
        }
    }

    await persist({ ...all, [key]: next });
    return next;
};

export const forgetEndpointProfile = async (
    authentication: ServerAuthenticationResult,
): Promise<void> => {
    const all = await loadAll();
    const key = getPersistedServerAuthKey(authentication);
    if (!(key in all)) {
        return;
    }
    const next = { ...all };
    delete next[key];
    await persist(next);
};

/**
 * File the address a user just logged in with into the slot it belongs in.
 *
 * Runs on connect and on restore, so a server set up before this existed picks
 * up a profile the first time it is used rather than needing the user to go
 * and fill one in. Never overwrites a slot that already holds something — the
 * user's own edits win.
 */
export const ensureEndpointProfileForConnection = async (
    authentication: ServerAuthenticationResult,
): Promise<ServerEndpointProfile> => {
    const existing = await getEndpointProfile(authentication);
    const url = normalizeBaseUrl(authentication.url);

    if (!url || existing.localUrl === url || existing.remoteUrl === url) {
        return existing;
    }

    const slot: keyof ServerEndpointProfile = isLanServerUrl(url) ? 'localUrl' : 'remoteUrl';
    if (existing[slot]) {
        return existing;
    }

    return updateEndpointProfile(authentication, { [slot]: url });
};

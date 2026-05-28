import { type ServerAuthenticationResult } from './server-auth';
import { getFetch, type SamoFetch } from './server-http';
import {
    type SamoStreamTokenResponse,
    finalizeSamoMediaUrl,
    getSamoBearerToken,
    mintSamoStreamToken,
} from './server-samo';
import { ServerType } from './server-types';

// Stream tokens live 30 min. We refresh 5 min before expiry so even slow
// boots keep `<audio src>` working without re-minting mid-playback. Tokens
// are scoped to a (server URL, bearer) pair — if either changes, drop the
// entry and mint anew.

const REFRESH_LEAD_TIME_MS = 5 * 60 * 1000;
const DEFAULT_FALLBACK_TTL_MS = 25 * 60 * 1000;

interface SamoStreamTokenEntry {
    bearer: string;
    expiresAt: number;
    token: string;
}

const cacheKey = (authentication: Pick<ServerAuthenticationResult, 'type' | 'url'>) =>
    `${authentication.type}:${authentication.url}`;

const cache = new Map<string, SamoStreamTokenEntry>();
const inflight = new Map<string, Promise<SamoStreamTokenEntry>>();

const parseExpiry = (response: SamoStreamTokenResponse): number => {
    if (response.expiresAt) {
        const parsed = Date.parse(response.expiresAt);
        if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now() + DEFAULT_FALLBACK_TTL_MS;
};

export const getCachedSamoStreamToken = (
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'type' | 'url'>,
): string | undefined => {
    const key = cacheKey(authentication);
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (entry.bearer !== getSamoBearerToken(authentication)) {
        cache.delete(key);
        return undefined;
    }
    if (entry.expiresAt - REFRESH_LEAD_TIME_MS <= Date.now()) {
        return undefined;
    }
    return entry.token;
};

export const ensureSamoStreamToken = async (
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'type' | 'url'>,
    fetcher?: SamoFetch,
): Promise<string | undefined> => {
    if (authentication.type !== ServerType.SAMO) return undefined;

    const cached = getCachedSamoStreamToken(authentication);
    if (cached) return cached;

    const key = cacheKey(authentication);
    const inflightEntry = inflight.get(key);
    if (inflightEntry) {
        const entry = await inflightEntry;
        return entry.token;
    }

    const request = getFetch(fetcher);
    const mintPromise = (async (): Promise<SamoStreamTokenEntry> => {
        const response = await mintSamoStreamToken(request, authentication);

        if (!response.token) {
            throw new Error('Samo Server did not return a stream token');
        }

        const entry: SamoStreamTokenEntry = {
            bearer: getSamoBearerToken(authentication),
            expiresAt: parseExpiry(response),
            token: response.token,
        };
        cache.set(key, entry);
        return entry;
    })();

    inflight.set(key, mintPromise);

    try {
        const entry = await mintPromise;
        return entry.token;
    } finally {
        inflight.delete(key);
    }
};

/** Build a fetchable image request for Samo `/api/v1/...` media URLs. */
export const buildSamoAuthenticatedImageRequest = (
    authentication: Pick<
        ServerAuthenticationResult,
        'credential' | 'ndCredential' | 'type' | 'url'
    >,
    url: string,
    cacheKey: string,
): { cacheKey: string; headers?: Record<string, string>; url: string } => {
    const streamToken = getCachedSamoStreamToken(authentication);
    const bearer = getSamoBearerToken(authentication);
    const finalizedUrl = finalizeSamoMediaUrl(authentication, url, streamToken) ?? url;
    const usesStreamToken = finalizedUrl.includes('stream_token=');

    return {
        cacheKey,
        headers: bearer && !usesStreamToken ? { Authorization: `Bearer ${bearer}` } : undefined,
        url: finalizedUrl,
    };
};

export const clearSamoStreamTokenCache = (
    authentication?: Pick<ServerAuthenticationResult, 'type' | 'url'>,
) => {
    if (!authentication) {
        cache.clear();
        return;
    }
    cache.delete(cacheKey(authentication));
};

import { type ServerAuthenticationResult } from './server-auth';
import { getFetch, isSamoAuthFailure, type SamoFetch } from './server-http';
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

// Minting sits in front of every interactive play: a user is waiting. The
// default 30s request timeout turned one dead pooled connection (typical
// after a long Doze-frozen session) into a 30-second dead tap; a tight
// timeout + one retry on a FRESH request self-heals it in single-digit
// seconds worst-case. The mint POST is idempotent (an extra token row is
// harmless), so the blind retry is safe.
const MINT_TIMEOUT_MS = 8_000;
const MINT_RETRY_DELAY_MS = 250;

interface SamoStreamTokenEntry {
    bearer: string;
    expiresAt: number;
    token: string;
}

const cacheKey = (authentication: Pick<ServerAuthenticationResult, 'type' | 'url'>) =>
    `${authentication.type}:${authentication.url}`;

const cache = new Map<string, SamoStreamTokenEntry>();
const inflight = new Map<string, Promise<SamoStreamTokenEntry>>();

/**
 * How long a FAILED mint suppresses the next attempt for the same server.
 *
 * Minting is driven by whatever happens to need a token, which on a dense
 * screen means "a great many callers in quick succession". Nothing about that
 * is throttled by the in-flight map, which only collapses callers that overlap
 * — a failure and the next attempt are sequential in time, so each one paid a
 * full request (two, before the auth-failure check above). Against a server
 * that is down, or a session that has been revoked, that is an unbounded retry
 * loop driven by scrolling.
 *
 * Short enough that recovery still feels immediate once the server comes back;
 * long enough that a screenful of consumers costs one request, not one each.
 */
const MINT_FAILURE_BACKOFF_MS = 10_000;
const failedAt = new Map<string, number>();

/**
 * The server's `expiresAt`, or the conservative fallback when it is unusable.
 *
 * Every guard here exists because the ALTERNATIVE to a sane expiry is a cache
 * that can never return what it just wrote: `getCachedSamoStreamToken` refuses
 * an entry within `REFRESH_LEAD_TIME_MS` of expiring, so an expiry that is
 * already past — or merely closer than the lead time — makes every single
 * `ensureSamoStreamToken` call a fresh network mint, forever.
 *
 * `Date.parse` is loose in exactly the directions that produce that: a bare
 * numeric TTL like "1800" parses as the YEAR 1800, and a zone-less datetime is
 * read as local time rather than UTC. Neither is what this server sends (it
 * marshals a Go time.Time built with .UTC(), so the string always ends in Z and
 * Hermes parses it correctly, fractional digits and all) — but a client cache
 * whose correctness depends on the server never changing its serialization is
 * not a cache, it is a bet. Kotlin's SamoStreamTokenCache.parseExpiresAtMs is
 * strict and falls back the same way; these two must not be able to disagree
 * about how long the same token lives.
 */
const parseExpiry = (response: SamoStreamTokenResponse): number => {
    const fallback = Date.now() + DEFAULT_FALLBACK_TTL_MS;
    if (!response.expiresAt) {
        return fallback;
    }
    const parsed = Date.parse(response.expiresAt);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    // A token that is already dead, or that would be refused by the lead-time
    // guard the moment it lands, is not usable — take the fallback rather than
    // caching something guaranteed to miss.
    if (parsed - REFRESH_LEAD_TIME_MS <= Date.now()) {
        return fallback;
    }
    return parsed;
};

export const getCachedSamoStreamToken = (
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'type' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'type' | 'url'>,
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

    // Still inside the backoff window from a recent failure: answer the way a
    // failed mint answers, without touching the network. Every caller already
    // treats `undefined` as "carry on without a token", so this degrades
    // exactly as a real failure does — it just does it for free.
    const lastFailure = failedAt.get(key);
    if (lastFailure !== undefined && Date.now() - lastFailure < MINT_FAILURE_BACKOFF_MS) {
        return undefined;
    }

    const request = getFetch(fetcher, MINT_TIMEOUT_MS);
    const mintPromise = (async (): Promise<SamoStreamTokenEntry> => {
        const response = await mintSamoStreamToken(request, authentication).catch(
            async (error: unknown) => {
                // A 401/403 is a real ANSWER, not a transport problem: the
                // credentials cannot mint, and asking again 250ms later just
                // doubles the load on a server that already said no. Only the
                // dead-pooled-connection case this retry was written for — the
                // one that follows a long Doze-frozen session — is worth a
                // second attempt.
                if (isSamoAuthFailure(error)) {
                    throw error;
                }
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, MINT_RETRY_DELAY_MS);
                });
                return mintSamoStreamToken(request, authentication);
            },
        );

        if (!response.token) {
            throw new Error('Samo Server did not return a stream token');
        }

        const entry: SamoStreamTokenEntry = {
            bearer: getSamoBearerToken(authentication),
            expiresAt: parseExpiry(response),
            token: response.token,
        };
        cache.set(key, entry);
        // A success clears the backoff, so recovery is immediate rather than
        // waiting out a window that no longer describes reality.
        failedAt.delete(key);
        return entry;
    })();

    inflight.set(key, mintPromise);

    try {
        const entry = await mintPromise;
        return entry.token;
    } catch (error) {
        failedAt.set(key, Date.now());
        throw error;
    } finally {
        inflight.delete(key);
    }
};

/** Build a fetchable image request for Samo `/api/v1/...` media URLs. */
export const buildSamoAuthenticatedImageRequest = (
    authentication: Pick<
        ServerAuthenticationResult,
        'credential' | 'type' | 'url'
    >,
    url: string,
    cacheKey: string,
): { cacheKey: string; headers?: Record<string, string>; url: string } => {
    const streamToken = getCachedSamoStreamToken(authentication);
    const bearer = getSamoBearerToken(authentication);
    const finalizedUrl = finalizeSamoMediaUrl(authentication, url, streamToken) ?? url;

    return {
        cacheKey,
        headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
        url: finalizedUrl,
    };
};

/**
 * Drop the cached token so the next `ensureSamoStreamToken` mints a fresh one.
 *
 * This is the response to a token the SERVER has stopped honouring — which is a
 * routine event, not an exceptional one: samo-server keeps its stream tokens in
 * a process-local map (`internal/users/streamtokens.go`) with no persistence,
 * so every server restart silently revokes every outstanding token while the
 * client is still holding one it believes has 29 minutes left.
 *
 * Clearing the backoff alongside the entry is the point: an explicit "this
 * token is dead" is new information, and making the caller wait out a window
 * that was measured against a different situation would strand playback.
 */
export const clearSamoStreamTokenCache = (
    authentication?: Pick<ServerAuthenticationResult, 'type' | 'url'>,
) => {
    if (!authentication) {
        cache.clear();
        failedAt.clear();
        return;
    }
    const key = cacheKey(authentication);
    cache.delete(key);
    failedAt.delete(key);
};

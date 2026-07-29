import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SamoFetch, type SamoFetchResponse, SamoHttpError } from './server-http';
import {
    clearSamoStreamTokenCache,
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
} from './server-samo-stream-token';
import { ServerType } from './server-types';

const auth = {
    credential: 'bearer-token',
    type: ServerType.SAMO,
    url: 'https://music.example',
};

const jsonResponse = (body: unknown): SamoFetchResponse => ({
    json: async () => body,
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
});

/** A fetcher that answers the mint endpoint with whatever the test hands it,
 *  and counts how many times it was asked. */
const mintingFetch = (
    responses: Array<(() => never) | unknown>,
): { calls: () => number; fetch: SamoFetch } => {
    let calls = 0;
    return {
        calls: () => calls,
        fetch: async () => {
            const next = responses[Math.min(calls, responses.length - 1)];
            calls += 1;
            if (typeof next === 'function') {
                return (next as () => never)();
            }
            return jsonResponse(next);
        },
    };
};

beforeEach(() => {
    clearSamoStreamTokenCache();
    vi.useRealTimers();
});

describe('stream-token expiry guards', () => {
    it('caches a token whose expiry is comfortably in the future', async () => {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const { fetch } = mintingFetch([{ expiresAt, token: 'smt_live' }]);

        await expect(ensureSamoStreamToken(auth, fetch)).resolves.toBe('smt_live');
        expect(getCachedSamoStreamToken(auth)).toBe('smt_live');
    });

    it('parses the RFC3339-with-nanoseconds shape a Go time.Time marshals to', async () => {
        // What samo-server actually emits: .UTC() + RFC3339Nano, so a trailing Z
        // and a variable number of fractional digits.
        const future = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace('Z', '123456Z');
        const { fetch } = mintingFetch([{ expiresAt: future, token: 'smt_nano' }]);

        await ensureSamoStreamToken(auth, fetch);
        expect(getCachedSamoStreamToken(auth)).toBe('smt_nano');
    });

    it('falls back to the conservative TTL when the expiry is already in the past', async () => {
        // Without the guard this entry would be written and then instantly
        // refused by the lead-time check, so every caller would re-mint forever.
        const { fetch } = mintingFetch([
            { expiresAt: new Date(Date.now() - 60_000).toISOString(), token: 'smt_stale' },
        ]);

        await ensureSamoStreamToken(auth, fetch);
        expect(getCachedSamoStreamToken(auth)).toBe('smt_stale');
    });

    it('falls back when the expiry is closer than the refresh lead time', async () => {
        const { fetch } = mintingFetch([
            { expiresAt: new Date(Date.now() + 60_000).toISOString(), token: 'smt_soon' },
        ]);

        await ensureSamoStreamToken(auth, fetch);
        expect(getCachedSamoStreamToken(auth)).toBe('smt_soon');
    });

    it('falls back on a bare numeric TTL rather than reading it as the year 1800', async () => {
        const { fetch } = mintingFetch([{ expiresAt: '1800', token: 'smt_numeric' }]);

        await ensureSamoStreamToken(auth, fetch);
        expect(getCachedSamoStreamToken(auth)).toBe('smt_numeric');
    });

    it('falls back on an unparseable expiry', async () => {
        const { fetch } = mintingFetch([{ expiresAt: 'not-a-date', token: 'smt_garbage' }]);

        await ensureSamoStreamToken(auth, fetch);
        expect(getCachedSamoStreamToken(auth)).toBe('smt_garbage');
    });
});

describe('stream-token failure handling', () => {
    it('does not retry an auth failure', async () => {
        const { calls, fetch } = mintingFetch([
            () => {
                throw new SamoHttpError(401, 'Request failed (401)');
            },
        ]);

        await expect(ensureSamoStreamToken(auth, fetch)).rejects.toThrow('Request failed (401)');
        // One attempt, not two: the credentials cannot mint, so asking again
        // only doubles the load on a server that already said no.
        expect(calls()).toBe(1);
    });

    it('retries once on a transport failure', async () => {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        let calls = 0;
        const fetch: SamoFetch = async () => {
            calls += 1;
            if (calls === 1) {
                throw new TypeError('Network request failed');
            }
            return jsonResponse({ expiresAt, token: 'smt_recovered' });
        };

        await expect(ensureSamoStreamToken(auth, fetch)).resolves.toBe('smt_recovered');
        expect(calls).toBe(2);
    });

    it('backs off instead of re-minting for every caller after a failure', async () => {
        const { calls, fetch } = mintingFetch([
            () => {
                throw new SamoHttpError(401, 'Request failed (401)');
            },
        ]);

        await expect(ensureSamoStreamToken(auth, fetch)).rejects.toThrow();
        const afterFirst = calls();

        // A screenful of consumers asking in sequence must not each pay a
        // request — this is the mint storm a dense grid used to produce.
        await expect(ensureSamoStreamToken(auth, fetch)).resolves.toBeUndefined();
        await expect(ensureSamoStreamToken(auth, fetch)).resolves.toBeUndefined();
        expect(calls()).toBe(afterFirst);
    });

    it('clearing the cache also clears the backoff, so recovery is immediate', async () => {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        let calls = 0;
        const fetch: SamoFetch = async () => {
            calls += 1;
            if (calls === 1) {
                throw new SamoHttpError(401, 'Request failed (401)');
            }
            return jsonResponse({ expiresAt, token: 'smt_after_reauth' });
        };

        await expect(ensureSamoStreamToken(auth, fetch)).rejects.toThrow();
        clearSamoStreamTokenCache(auth);

        await expect(ensureSamoStreamToken(auth, fetch)).resolves.toBe('smt_after_reauth');
    });
});

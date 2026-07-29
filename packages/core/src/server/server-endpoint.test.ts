import { describe, expect, it, vi } from 'vitest';

import type { SamoFetch, SamoFetchResponse } from './server-http';

import {
    orderEndpointCandidates,
    probeServerEndpoint,
    resolveServerEndpoint,
    selectServerEndpoint,
} from './server-endpoint';

const health = (body: unknown, ok = true): SamoFetchResponse => ({
    json: async () => body,
    ok,
    status: ok ? 200 : 500,
});

/** Answers /health per-host; any host not listed is unreachable. */
const fetcherFor = (hosts: Record<string, unknown>): SamoFetch => {
    return vi.fn(async (url: string) => {
        const host = url.replace(/\/health$/, '');

        if (!(host in hosts)) {
            throw new Error('unreachable');
        }

        return health(hosts[host]);
    }) as unknown as SamoFetch;
};

const LAN = 'http://192.168.1.10:6969';
const REMOTE = 'https://music.example.com';

describe('probeServerEndpoint', () => {
    it('reports the identity an address advertises', async () => {
        const result = await probeServerEndpoint(
            fetcherFor({ [LAN]: { ok: true, serverId: 'srv-abc' } }),
            LAN,
        );

        expect(result).toEqual({ reachable: true, serverId: 'srv-abc' });
    });

    it('treats a thrown request as unreachable rather than failing', async () => {
        expect(await probeServerEndpoint(fetcherFor({}), LAN)).toEqual({ reachable: false });
    });

    it('treats a non-ok response as unreachable', async () => {
        const fetcher = vi.fn(async () => health(null, false)) as unknown as SamoFetch;

        expect(await probeServerEndpoint(fetcher, LAN)).toEqual({ reachable: false });
    });

    it('reports reachable without an identity for a server that issues none', async () => {
        const result = await probeServerEndpoint(fetcherFor({ [LAN]: { ok: true } }), LAN);

        expect(result).toEqual({ reachable: true, serverId: undefined });
    });
});

describe('resolveServerEndpoint', () => {
    it('prefers a discovered address that proves it is the right server', async () => {
        const selection = await resolveServerEndpoint(
            fetcherFor({
                [LAN]: { ok: true, serverId: 'srv-abc' },
                [REMOTE]: { ok: true, serverId: 'srv-abc' },
            }),
            {
                candidates: orderEndpointCandidates({
                    configuredUrl: REMOTE,
                    discoveredUrls: [LAN],
                }),
                expectedServerId: 'srv-abc',
            },
        );

        expect(selection).toEqual({ origin: 'discovered', url: LAN, verified: true });
    });

    // The safety property: a box answering on the LAN is not automatically the
    // user's server. Without a matching identity it must be ignored.
    it('ignores a discovered address belonging to a different server', async () => {
        const selection = await resolveServerEndpoint(
            fetcherFor({
                [LAN]: { ok: true, serverId: 'srv-someone-else' },
                [REMOTE]: { ok: true, serverId: 'srv-abc' },
            }),
            {
                candidates: orderEndpointCandidates({
                    configuredUrl: REMOTE,
                    discoveredUrls: [LAN],
                }),
                expectedServerId: 'srv-abc',
            },
        );

        expect(selection).toEqual({ origin: 'configured', url: REMOTE, verified: true });
    });

    it('falls back to the configured address when the local one is gone', async () => {
        const selection = await resolveServerEndpoint(
            fetcherFor({ [REMOTE]: { ok: true, serverId: 'srv-abc' } }),
            {
                candidates: orderEndpointCandidates({
                    configuredUrl: REMOTE,
                    discoveredUrls: [LAN],
                }),
                expectedServerId: 'srv-abc',
            },
        );

        expect(selection).toEqual({ origin: 'configured', url: REMOTE, verified: true });
    });

    // Nothing can be verified without an identity, so the configured address is
    // used as-is rather than gambling on a discovered one.
    it('uses the configured address unprobed when there is no identity to check', async () => {
        const fetcher = fetcherFor({ [LAN]: { ok: true } });

        const selection = await resolveServerEndpoint(fetcher, {
            candidates: orderEndpointCandidates({
                configuredUrl: REMOTE,
                discoveredUrls: [LAN],
            }),
        });

        expect(selection).toEqual({ origin: 'configured', url: REMOTE, verified: false });
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('falls back unverified when no candidate answers', async () => {
        const selection = await resolveServerEndpoint(fetcherFor({}), {
            candidates: orderEndpointCandidates({
                configuredUrl: REMOTE,
                discoveredUrls: [LAN],
            }),
            expectedServerId: 'srv-abc',
        });

        expect(selection).toEqual({ origin: 'configured', url: REMOTE, verified: false });
    });
});

describe('selectServerEndpoint', () => {
    const local = { kind: 'local' as const, url: LAN };
    const remote = { kind: 'remote' as const, url: REMOTE };

    it('takes the first address in the caller order that answers', async () => {
        expect(
            await selectServerEndpoint(
                fetcherFor({ [LAN]: { ok: true }, [REMOTE]: { ok: true } }),
                { options: [local, remote] },
            ),
        ).toEqual({ kind: 'local', url: LAN, verified: false });
    });

    it('falls through to the next address when the preferred one is not on this network', async () => {
        expect(
            await selectServerEndpoint(fetcherFor({ [REMOTE]: { ok: true } }), {
                options: [local, remote],
            }),
        ).toEqual({ kind: 'remote', url: REMOTE, verified: false });
    });

    // Both addresses were typed by the user for their own server, so answering
    // is enough. Identity, when the server has one, only guards against
    // pointing at the WRONG server.
    it('marks a matching identity as verified', async () => {
        expect(
            await selectServerEndpoint(fetcherFor({ [LAN]: { ok: true, serverId: 'srv-abc' } }), {
                expectedServerId: 'srv-abc',
                options: [local, remote],
            }),
        ).toEqual({ kind: 'local', url: LAN, verified: true });
    });

    it('refuses an address that answers for a different server', async () => {
        expect(
            await selectServerEndpoint(
                fetcherFor({
                    [LAN]: { ok: true, serverId: 'srv-someone-else' },
                    [REMOTE]: { ok: true, serverId: 'srv-abc' },
                }),
                { expectedServerId: 'srv-abc', options: [local, remote] },
            ),
        ).toEqual({ kind: 'remote', url: REMOTE, verified: true });
    });

    // A server predating identities is still perfectly usable, and the address
    // is one the user configured — so no identity means unverified, not refused.
    it('accepts an address that reports no identity at all', async () => {
        expect(
            await selectServerEndpoint(fetcherFor({ [LAN]: { ok: true } }), {
                expectedServerId: 'srv-abc',
                options: [local],
            }),
        ).toEqual({ kind: 'local', url: LAN, verified: false });
    });

    // The caller's cue to go offline. Returning an address anyway would send
    // every surface in the app off to time out against it, one at a time.
    it('returns null when nothing answers', async () => {
        expect(
            await selectServerEndpoint(fetcherFor({}), { options: [local, remote] }),
        ).toBeNull();
    });

    it('returns null when there is nothing configured to probe', async () => {
        const fetcher = fetcherFor({});
        expect(await selectServerEndpoint(fetcher, { options: [] })).toBeNull();
        expect(fetcher).not.toHaveBeenCalled();
    });

    // Probing together is what bounds an off-network launch at ONE timeout
    // instead of one per address.
    it('probes every address concurrently rather than in sequence', async () => {
        let inFlight = 0;
        let peak = 0;
        const fetcher = vi.fn(async () => {
            inFlight += 1;
            peak = Math.max(peak, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 5));
            inFlight -= 1;
            throw new Error('unreachable');
        }) as unknown as SamoFetch;

        await selectServerEndpoint(fetcher, { options: [local, remote] });

        expect(peak).toBeGreaterThan(1);
    });
});

describe('orderEndpointCandidates', () => {
    it('puts discovered addresses ahead of the configured one', () => {
        expect(orderEndpointCandidates({ configuredUrl: REMOTE, discoveredUrls: [LAN] })).toEqual([
            { origin: 'discovered', url: LAN },
            { origin: 'configured', url: REMOTE },
        ]);
    });

    it('does not probe the same address twice when discovery finds the configured one', () => {
        expect(
            orderEndpointCandidates({ configuredUrl: REMOTE, discoveredUrls: [`${REMOTE}/`] }),
        ).toEqual([{ origin: 'discovered', url: REMOTE }]);
    });

    it('drops empty addresses', () => {
        expect(
            orderEndpointCandidates({ configuredUrl: REMOTE, discoveredUrls: ['', '   '] }),
        ).toEqual([{ origin: 'configured', url: REMOTE }]);
    });
});

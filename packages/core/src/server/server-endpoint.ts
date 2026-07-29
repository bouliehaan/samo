/**
 * Choosing which address to talk to a known server on.
 *
 * A server is usually reachable at more than one address: a LAN address that is
 * fast and free, and a remote hostname that works from anywhere. Picking the
 * LAN address when it is available is the difference between streaming across
 * the room and streaming across the internet — but only if the client can prove
 * the address really is the server it means to talk to. Reachability alone
 * cannot do that; any box on the network can answer on a port.
 *
 * That proof is the server-issued identity, which is why local-first selection
 * is gated on it: an address is only preferred over the configured one when it
 * reports the identity the client already trusts.
 */

import { normalizeBaseUrl, type SamoFetch } from './server-http';

/** How a candidate address became known. */
export type ServerEndpointOrigin = 'configured' | 'discovered';

/**
 * Which of a server's two configured addresses an option is.
 *
 * Distinct from [ServerEndpointOrigin] because the trust model is different: a
 * `discovered` address is whatever answered a broadcast and has to prove its
 * identity before it is used, whereas `local` and `remote` are addresses the
 * user typed for their own server. Reachability is enough for those — the
 * identity check, when an identity exists, only guards against pointing at the
 * wrong server by mistake.
 */
export type ServerEndpointKind = 'local' | 'remote';

export interface ServerEndpointOption {
    kind: ServerEndpointKind;
    url: string;
}

export interface ServerEndpointChoice {
    kind: ServerEndpointKind;
    url: string;
    /** True when the address proved its identity, not merely that it answered. */
    verified: boolean;
}

export interface ServerEndpointCandidate {
    origin: ServerEndpointOrigin;
    url: string;
}

export interface ServerEndpointProbeResult {
    reachable: boolean;
    /** Identity the address reported, when it reported one. */
    serverId?: string;
}

export interface ServerEndpointSelection {
    origin: ServerEndpointOrigin;
    /** False when nothing verified and the configured address was used as-is. */
    verified: boolean;
    url: string;
}

interface HealthPayload {
    ok?: boolean;
    serverId?: string;
}

/** Probes are cheap but not free; keep them well under a user-visible delay. */
export const DEFAULT_ENDPOINT_PROBE_TIMEOUT_MS = 2_000;

const probeUrl = async (
    fetcher: SamoFetch,
    url: string,
    signal?: AbortSignal,
): Promise<null | ServerEndpointProbeResult> => {
    try {
        const response = await fetcher(url, { method: 'GET', signal });

        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as HealthPayload | null;
        const serverId =
            payload && typeof payload.serverId === 'string' ? payload.serverId.trim() : '';

        return { reachable: true, serverId: serverId || undefined };
    } catch {
        return null;
    }
};

/**
 * Asks an address who it is.
 *
 * Works before authentication and costs one small unauthenticated round-trip.
 * Never throws: an unreachable or unparseable address is simply not reachable.
 *
 * Two routes are tried, because "is anything of ours listening here?" and "who
 * is it?" are separable questions and only the first one is load-bearing.
 * `/health` answers both and is the cheaper call. `/api/v1/setup/status` is the
 * route the login path has always probed, so it is present on every server this
 * client can talk to at all — falling back to it means an endpoint check can
 * never report a perfectly good server as unreachable merely because it
 * predates `/health`. That failure mode is not academic: this result decides
 * whether the app drops into offline mode.
 */
export const probeServerEndpoint = async (
    fetcher: SamoFetch,
    url: string,
    signal?: AbortSignal,
): Promise<ServerEndpointProbeResult> => {
    const baseUrl = normalizeBaseUrl(url);

    return (
        (await probeUrl(fetcher, `${baseUrl}/health`, signal)) ??
        (await probeUrl(fetcher, `${baseUrl}/api/v1/setup/status`, signal)) ?? {
            reachable: false,
        }
    );
};

/**
 * Picks the address to use for a server whose identity is already known.
 *
 * Candidates are tried in order, so callers express preference by ordering them
 * — discovered LAN addresses first, the configured address last. A candidate
 * wins only when it both answers and reports `expectedServerId`.
 *
 * When the client has no identity to check against (a server predating identity
 * support), nothing can be verified, so the configured address is used
 * unchanged rather than gambling on a discovered one.
 */
export const resolveServerEndpoint = async (
    fetcher: SamoFetch,
    options: {
        candidates: ServerEndpointCandidate[];
        expectedServerId?: string;
        signal?: AbortSignal;
    },
): Promise<ServerEndpointSelection> => {
    const { candidates, expectedServerId, signal } = options;

    const configured =
        candidates.find((candidate) => candidate.origin === 'configured') ?? candidates[0];
    const fallback: ServerEndpointSelection = {
        origin: configured?.origin ?? 'configured',
        url: normalizeBaseUrl(configured?.url ?? ''),
        verified: false,
    };

    const expected = expectedServerId?.trim();

    if (!expected) {
        return fallback;
    }

    for (const candidate of candidates) {
        const url = normalizeBaseUrl(candidate.url);

        if (!url) {
            continue;
        }

        const probe = await probeServerEndpoint(fetcher, url, signal);

        if (probe.reachable && probe.serverId === expected) {
            return { origin: candidate.origin, url, verified: true };
        }
    }

    return fallback;
};

/**
 * Picks which of a server's own addresses to use right now.
 *
 * Every option is probed CONCURRENTLY, then accepted in the order given. That
 * combination is the whole point: an address that is not on the current network
 * usually does not refuse a connection, it silently drops the packets, so
 * trying addresses one after another makes every off-network launch wait out a
 * full timeout before it even starts asking about the address that works.
 * Probing together costs the same one round-trip and bounds the total wait at
 * the slowest single probe; consulting them in order keeps the caller's
 * preference authoritative.
 *
 * Caller preference is the ONLY ordering here — this function has no opinion
 * about which address is better. That belongs with whoever knows the current
 * network and which address worked last time.
 *
 * Returns null when nothing answered, which is the caller's cue to go offline
 * rather than to pick an address and hope.
 */
export const selectServerEndpoint = async (
    fetcher: SamoFetch,
    options: {
        expectedServerId?: string;
        options: ServerEndpointOption[];
        signal?: AbortSignal;
    },
): Promise<ServerEndpointChoice | null> => {
    const expected = options.expectedServerId?.trim();

    const candidates = options.options
        .map((option) => ({ ...option, url: normalizeBaseUrl(option.url) }))
        .filter((option) => option.url.length > 0);

    if (candidates.length === 0) {
        return null;
    }

    const probes = candidates.map(async (option) => ({
        option,
        probe: await probeServerEndpoint(fetcher, option.url, options.signal),
    }));

    for (const pending of probes) {
        const { option, probe } = await pending;

        if (!probe.reachable) {
            continue;
        }

        // A DIFFERENT identity is the one hard rejection: the address answers,
        // but not for this server, and streaming from it would mean serving one
        // library's ids out of another's catalog. An address that reports no
        // identity is accepted unverified — the user configured it, and servers
        // predating identities are still perfectly usable.
        if (expected && probe.serverId && probe.serverId !== expected) {
            continue;
        }

        return {
            kind: option.kind,
            url: option.url,
            verified: Boolean(expected && probe.serverId === expected),
        };
    }

    return null;
};

/**
 * Orders candidate addresses so the resolver prefers a local one.
 *
 * Discovered addresses come first because discovery only ever reports servers
 * on the current network — reaching one means staying off the internet
 * entirely. Duplicates are dropped so a discovered address that matches the
 * configured one is not probed twice.
 */
export const orderEndpointCandidates = (options: {
    configuredUrl: string;
    discoveredUrls?: string[];
}): ServerEndpointCandidate[] => {
    const seen = new Set<string>();
    const candidates: ServerEndpointCandidate[] = [];

    const push = (rawUrl: string, origin: ServerEndpointOrigin) => {
        const url = normalizeBaseUrl(rawUrl);

        if (!url || seen.has(url)) {
            return;
        }

        seen.add(url);
        candidates.push({ origin, url });
    };

    for (const discovered of options.discoveredUrls ?? []) {
        push(discovered, 'discovered');
    }

    push(options.configuredUrl, 'configured');

    return candidates;
};

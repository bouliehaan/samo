import {
    adaptNativeFetch,
    clearSamoStreamTokenCache,
    normalizeBaseUrl,
    selectServerEndpoint,
    withRequestTimeout,
    type SamoFetch,
    type ServerEndpointOption,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { getAuthSession, setServerConnection } from '../state/auth-session';
import {
    getNetworkSnapshot,
    setServerReachability,
    type ActiveEndpointOrigin,
} from '../state/network-state';
import { androidLog } from '../utils/log';
import { orderServerEndpointOptions } from './endpoint-order';
import { savePersistedServerAuths } from './persisted-server';
import {
    ensureEndpointProfileForConnection,
    getEndpointProfile,
    updateEndpointProfile,
    type ServerEndpointProfile,
} from './server-endpoints';

/**
 * How long one address gets to answer.
 *
 * An address that is not on the current network usually doesn't refuse the
 * connection, it swallows the packets — so this is really "how long we're
 * willing to wait to find that out". Short, because both addresses are probed
 * at once and nothing on screen is waiting: the mirror has already painted.
 */
const PROBE_TIMEOUT_MS = 2_500;

/** Floor between probe rounds. Connectivity callbacks arrive in bursts (a
 *  Wi-Fi association fires several capability changes); without this, one
 *  handshake would mean half a dozen probe rounds. */
const MIN_PROBE_INTERVAL_MS = 4_000;

/** Retry cadence while the server is unreachable and the app is in front. Slow
 *  enough to be free, fast enough that walking back into range feels instant. */
const RECOVERY_RETRY_MS = 20_000;

// A single attempt per round: `getFetch` would wrap this in the idempotent-GET
// retry, which doubles the wait for exactly the case a probe is trying to
// detect quickly.
const probeFetch: SamoFetch = withRequestTimeout(adaptNativeFetch(fetch), PROBE_TIMEOUT_MS);

const buildOptions = (
    authentication: ServerAuthenticationResult,
    profile: ServerEndpointProfile,
): ServerEndpointOption[] => {
    const options = orderServerEndpointOptions({
        homeSsid: profile.homeSsid,
        lastUsedKind: profile.lastUsedKind,
        localUrl: profile.localUrl,
        remoteUrl: profile.remoteUrl,
        ssid: getNetworkSnapshot().ssid,
        transport: getNetworkSnapshot().transport,
    });

    // Safety net for a server whose profile has not been filled in yet: the
    // address it is currently authenticated against is always a candidate, so
    // this can never leave a working connection with nothing to probe.
    const currentUrl = normalizeBaseUrl(authentication.url);
    if (currentUrl && !options.some((option) => option.url === currentUrl)) {
        options.push({ kind: 'local', url: currentUrl });
    }

    return options;
};

/**
 * Move the live connection onto a different address.
 *
 * Only `url` changes. Everything that identifies this server to the rest of the
 * app — its connection key, and therefore its mirrored catalog, its downloads
 * and its progress — is deliberately keyed off something else, so the same
 * library is the same library whichever way the device is reaching it.
 */
const applyEndpoint = async (
    authentication: ServerAuthenticationResult,
    url: string,
): Promise<void> => {
    const next: ServerAuthenticationResult = { ...authentication, url };

    // The stream token was minted through the old address and cached under it.
    // Dropping it now means the next play mints against the address that
    // actually works, instead of waiting out a request to one that doesn't.
    clearSamoStreamTokenCache(authentication);

    setServerConnection((current) =>
        current && current.url === authentication.url ? next : current,
    );
    // Writes the credential record AND pushes the Kotlin auth mirror, which is
    // what points the background sync and the download worker at the new
    // address too.
    await savePersistedServerAuths([next]);
};

let probeInFlight: null | Promise<void> = null;
let lastProbeAt = 0;
let recoveryTimer: null | ReturnType<typeof setInterval> = null;

const runSelection = async (): Promise<void> => {
    const authentication = getAuthSession().serverConnection;
    if (!authentication) {
        return;
    }

    const network = getNetworkSnapshot();

    // No radio: there is nothing to probe and the answer is already known.
    // Reporting it explicitly is what puts the app into offline mode instead
    // of leaving every surface to discover the dead link one timeout at a time.
    if (!network.isDeviceOnline) {
        setServerReachability('unreachable');
        return;
    }

    // The user has said "stay offline". Probing anyway would be the one network
    // call a forced-offline app makes, which is exactly the promise it breaks.
    if (network.offlinePreference === 'forced') {
        return;
    }

    const profile = await ensureEndpointProfileForConnection(authentication);
    const options = buildOptions(authentication, profile);
    const choice = await selectServerEndpoint(probeFetch, {
        expectedServerId: authentication.serverId,
        options,
    });

    if (!choice) {
        setServerReachability('unreachable');
        return;
    }

    const origin: ActiveEndpointOrigin = choice.kind;
    setServerReachability('reachable', origin);

    if (profile.lastUsedKind !== choice.kind) {
        await updateEndpointProfile(authentication, { lastUsedKind: choice.kind });
    }

    if (normalizeBaseUrl(authentication.url) !== choice.url) {
        androidLog.info('[network] switching server endpoint', {
            from: authentication.url,
            origin,
            to: choice.url,
        });
        await applyEndpoint(authentication, choice.url);
    }
};

/**
 * Re-decide which address to talk to the server on.
 *
 * Safe to call from anywhere and as often as connectivity moves: concurrent
 * callers share one round, and rounds are rate-limited. `force` is for the
 * places where the user is watching (the network settings screen, a manual
 * retry) and a stale answer would look like the app ignoring them.
 */
export const refreshActiveEndpoint = async (options?: { force?: boolean }): Promise<void> => {
    if (probeInFlight) {
        return probeInFlight;
    }
    if (!options?.force && Date.now() - lastProbeAt < MIN_PROBE_INTERVAL_MS) {
        return;
    }

    lastProbeAt = Date.now();
    probeInFlight = runSelection()
        .catch((error) => {
            androidLog.error('[network] endpoint selection failed', { error });
        })
        .finally(() => {
            probeInFlight = null;
        });

    return probeInFlight;
};

/**
 * Keep retrying while the server is out of reach.
 *
 * Connectivity events cover moving between networks, but not the case where the
 * network never changed and the SERVER came back — the box finished rebooting,
 * the tunnel reconnected. Without a retry the app would sit in offline mode
 * until something else happened to poke it.
 *
 * Runs only while unreachable, so a healthy app pays nothing.
 */
export const startEndpointRecoveryWatch = (): void => {
    if (recoveryTimer) {
        return;
    }
    recoveryTimer = setInterval(() => {
        const network = getNetworkSnapshot();
        if (
            network.serverReachability !== 'unreachable' ||
            !network.isDeviceOnline ||
            network.offlinePreference === 'forced' ||
            !getAuthSession().serverConnection
        ) {
            return;
        }
        void refreshActiveEndpoint({ force: true });
    }, RECOVERY_RETRY_MS);
};

export const stopEndpointRecoveryWatch = (): void => {
    if (recoveryTimer) {
        clearInterval(recoveryTimer);
        recoveryTimer = null;
    }
};

/** Apply an edit from the network settings screen: persist it, then act on it
 *  immediately so the readout reflects the change rather than describing the
 *  configuration it replaced. */
export const saveServerEndpointSettings = async (
    authentication: ServerAuthenticationResult,
    patch: Partial<ServerEndpointProfile>,
): Promise<ServerEndpointProfile> => {
    const profile = await updateEndpointProfile(authentication, patch);
    await refreshActiveEndpoint({ force: true });
    return profile;
};

export const readServerEndpointSettings = getEndpointProfile;

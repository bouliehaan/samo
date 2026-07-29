/**
 * What "offline" means, on its own, with no store and no I/O.
 *
 * The app used to answer this in several places at once — a boolean in the
 * downloads store, an implicit "did the request throw" at each call site, and a
 * boot-time health check that reported a dropped Wi-Fi as an auth problem.
 * Pulling the rule out to one pure function is what makes it possible to say
 * the app has a single definition of being offline, and to test that definition
 * without a device.
 */

/**
 * How the app decides whether it is offline.
 *
 * - `auto`   — follow reality: offline whenever the radio is down or the server
 *              answers on none of its addresses, online again the moment it does.
 * - `forced` — stay offline regardless (data discipline, metered roaming).
 * - `never`  — never go offline on our own. The escape hatch for a server that
 *              is genuinely up but fails our reachability probe.
 */
export type OfflinePreference = 'auto' | 'forced' | 'never';

export type NetworkTransport = 'cellular' | 'ethernet' | 'none' | 'other' | 'wifi';

/** Which of a server's configured addresses the app is currently talking to. */
export type ActiveEndpointOrigin = 'local' | 'remote';

/**
 * What the app currently believes about reaching its server.
 *
 * `unknown` is the honest boot state and is deliberately NOT treated as
 * offline: the mirror paints instantly and the first probe lands moments
 * later, so guessing "offline" here would flash an offline app at every launch.
 */
export type ServerReachability = 'reachable' | 'unknown' | 'unreachable';

/** Everything the app OBSERVES, without the one thing it concludes. */
export interface NetworkFacts {
    /** Which address won the last endpoint selection, for the settings readout. */
    activeEndpointOrigin: ActiveEndpointOrigin | null;
    /** True once the persisted preference has been read. */
    hydrated: boolean;
    /** The system's view: at least one validated internet route exists. */
    isDeviceOnline: boolean;
    offlinePreference: OfflinePreference;
    serverReachability: ServerReachability;
    /** Current Wi-Fi name, or null when unknown (no permission, not on Wi-Fi). */
    ssid: null | string;
    transport: NetworkTransport;
}

export const deriveIsOffline = (facts: NetworkFacts): boolean => {
    if (facts.offlinePreference === 'forced') {
        return true;
    }
    if (facts.offlinePreference === 'never') {
        return false;
    }
    return !facts.isDeviceOnline || facts.serverReachability === 'unreachable';
};

/** Cycle order for the single Settings row: the two everyday states first,
 *  with the diagnostic escape hatch last. */
export const nextOfflinePreference = (current: OfflinePreference): OfflinePreference =>
    current === 'auto' ? 'forced' : current === 'forced' ? 'never' : 'auto';

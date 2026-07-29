import { useStoreSelector } from './use-store-selector';

import { loadOfflinePreference, saveOfflinePreference } from '../services/offline-mode';
import {
    deriveIsOffline,
    nextOfflinePreference,
    type ActiveEndpointOrigin,
    type NetworkFacts,
    type NetworkTransport,
    type OfflinePreference,
    type ServerReachability,
} from './offline-policy';

export {
    type ActiveEndpointOrigin,
    type NetworkFacts,
    type NetworkTransport,
    nextOfflinePreference,
    type OfflinePreference,
    type ServerReachability,
};

export type NetworkState = {
    /**
     * THE flag the rest of the app reads. Derived — never set directly — so
     * there is exactly one definition of "we are offline" in the codebase.
     */
    isOffline: boolean;
} & NetworkFacts;

const initialFacts: NetworkFacts = {
    activeEndpointOrigin: null,
    hydrated: false,
    // Optimistic until the native module answers: a false "offline" on the
    // first frame would gate away the very boot requests that prove otherwise.
    isDeviceOnline: true,
    offlinePreference: 'auto',
    serverReachability: 'unknown',
    ssid: null,
    transport: 'other',
};

const withDerived = (facts: NetworkFacts): NetworkState => ({
    ...facts,
    isOffline: deriveIsOffline(facts),
});

let networkState: NetworkState = withDerived(initialFacts);
const listeners = new Set<() => void>();

const patchNetwork = (patch: Partial<NetworkFacts>): void => {
    const next = withDerived({ ...networkState, ...patch });

    // Field-wise equality, not reference equality: these writes arrive from a
    // native connectivity callback that re-fires on every capability change,
    // and most of them say exactly what we already knew.
    let changed = false;
    for (const key of Object.keys(next) as Array<keyof NetworkState>) {
        if (!Object.is(next[key], networkState[key])) {
            changed = true;
            break;
        }
    }
    if (!changed) {
        return;
    }

    networkState = next;
    listeners.forEach((listener) => listener());
};

const subscribeNetwork = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/** Non-hook subscription, for the services that have to REACT to connectivity
 *  rather than render it. */
export const subscribeNetworkState = subscribeNetwork;

export const getNetworkSnapshot = (): NetworkState => networkState;

/** True when no network call should be attempted. Read this at call time from
 *  handlers and services; components use `useNetworkSelector`. */
export const isOfflineNow = (): boolean => networkState.isOffline;

export const setDeviceNetworkStatus = (status: {
    isDeviceOnline: boolean;
    ssid: null | string;
    transport: NetworkTransport;
}): void => {
    // Coming back onto a network invalidates what we knew about the server:
    // "unreachable" was measured against a link that no longer exists, and
    // keeping it would hold the app offline until something else re-probed.
    const rejoined = status.isDeviceOnline && !networkState.isDeviceOnline;
    patchNetwork({
        ...status,
        ...(rejoined ? { serverReachability: 'unknown' } : {}),
    });
};

export const setServerReachability = (
    serverReachability: ServerReachability,
    activeEndpointOrigin?: ActiveEndpointOrigin | null,
): void => {
    patchNetwork({
        serverReachability,
        ...(activeEndpointOrigin === undefined ? {} : { activeEndpointOrigin }),
    });
};

export const setOfflinePreference = (offlinePreference: OfflinePreference): void => {
    patchNetwork({ offlinePreference });
    void saveOfflinePreference(offlinePreference);
};

// ---------------------------------------------------------------------------
// Boot hydration.
//
// The preference must be on hand BEFORE anything decides to hit the network,
// otherwise a launch in forced-offline still fires a full boot's worth of
// requests at a server the user told us not to talk to. `whenNetworkHydrated`
// is what the boot sequence awaits — a single fast file read, resolved once.
// ---------------------------------------------------------------------------

const hydration = (async () => {
    const offlinePreference = await loadOfflinePreference();
    patchNetwork({ hydrated: true, offlinePreference });
})();

export const whenNetworkHydrated = (): Promise<void> => hydration;

/**
 * Subscribe to one slice of the network state. Most consumers want
 * `(state) => state.isOffline`, which only moves on a genuine connectivity or
 * preference change — not on every capability callback the system fires.
 */
export const useNetworkSelector = <Selected>(
    selector: (state: NetworkState) => Selected,
): Selected => useStoreSelector(subscribeNetwork, () => networkState, selector);

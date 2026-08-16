import { normalizeBaseUrl, type ServerEndpointOption } from '@samo/core/server';

/**
 * The order to consult a server's addresses in.
 *
 * Ordering is the entire performance story of endpoint selection. Both
 * addresses are probed at once, so getting the order wrong never picks the
 * wrong one — it only means waiting out a dropped-packet timeout on an address
 * that isn't on this network before looking at the answer that was already
 * sitting there.
 *
 * The Wi-Fi name, when the user has pinned one and the platform will tell us
 * what we are on, is a definitive answer and outranks everything.
 *
 * Failing that, the TRANSPORT decides, because it bounds what is even possible:
 * a LAN address cannot be reachable over cellular, and it is the only kind that
 * can be reachable over Wi-Fi or Ethernet. Reading the Wi-Fi name needs location
 * permission on Android and is frequently unavailable, so "on Wi-Fi, name
 * unknown" is the ordinary case rather than the edge case, and it has to be
 * handled by something better than history.
 *
 * History (`lastUsedKind`) is the last resort, for a transport we cannot
 * classify. It deliberately does NOT outrank the transport: it is self-
 * reinforcing, so one round that settled on the remote address would otherwise
 * keep the app on the remote address on every network forever — streaming from
 * across the internet while sitting next to the server.
 *
 * Ordering local first on a foreign Wi-Fi costs one probe timeout before the
 * remote answer (already sitting there, since probes run concurrently) is
 * accepted. That is the right side of the trade: nothing on screen is waiting on
 * this, and the alternative is being permanently wrong about the network.
 *
 * Kept apart from the selection service (and free of every import that touches
 * the network, the stores or the platform) because it is the part with real
 * branching, and it should be testable without any of that.
 */
export const orderServerEndpointOptions = (options: {
    homeSsid?: string;
    lastUsedKind?: 'local' | 'remote';
    localUrl?: string;
    remoteUrl?: string;
    ssid?: null | string;
    transport?: string;
}): ServerEndpointOption[] => {
    const local = normalizeBaseUrl(options.localUrl);
    const remote = normalizeBaseUrl(options.remoteUrl);

    const localFirst = (() => {
        if (options.homeSsid && options.ssid) {
            return options.ssid === options.homeSsid;
        }
        if (options.transport === 'cellular') {
            return false;
        }
        if (options.transport === 'wifi' || options.transport === 'ethernet') {
            return true;
        }
        if (options.lastUsedKind) {
            return options.lastUsedKind === 'local';
        }
        return true;
    })();

    const ordered: ServerEndpointOption[] = localFirst
        ? [
              { kind: 'local', url: local },
              { kind: 'remote', url: remote },
          ]
        : [
              { kind: 'remote', url: remote },
              { kind: 'local', url: local },
          ];

    const seen = new Set<string>();
    return ordered.filter((option) => {
        if (!option.url || seen.has(option.url)) {
            return false;
        }
        seen.add(option.url);
        return true;
    });
};

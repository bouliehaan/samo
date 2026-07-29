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
 * what we are on, is a definitive answer and outranks everything. Failing that,
 * the address that worked last time is the best available guess — networks
 * change far less often than the app checks. Cellular is the one case that can
 * be reasoned about with no history at all: a LAN address cannot possibly be
 * reachable over it.
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

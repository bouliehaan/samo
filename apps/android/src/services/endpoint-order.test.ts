import { describe, expect, it } from 'vitest';

import { orderServerEndpointOptions } from './endpoint-order';

const LOCAL = 'http://192.168.1.10:6969';
const REMOTE = 'https://music.example.com';

describe('orderServerEndpointOptions', () => {
    it('puts the local address first on the pinned home network', () => {
        expect(
            orderServerEndpointOptions({
                homeSsid: 'Home',
                localUrl: LOCAL,
                remoteUrl: REMOTE,
                ssid: 'Home',
            }).map((option) => option.kind),
        ).toEqual(['local', 'remote']);
    });

    it('puts the remote address first on any other network', () => {
        expect(
            orderServerEndpointOptions({
                homeSsid: 'Home',
                localUrl: LOCAL,
                remoteUrl: REMOTE,
                ssid: 'Cafe',
            }).map((option) => option.kind),
        ).toEqual(['remote', 'local']);
    });

    // A LAN address cannot be reachable over cellular, so trying it first would
    // only buy a dropped-packet timeout before looking at the answer that works.
    it('skips ahead to the remote address on cellular', () => {
        expect(
            orderServerEndpointOptions({
                localUrl: LOCAL,
                remoteUrl: REMOTE,
                transport: 'cellular',
            })[0]?.kind,
        ).toBe('remote');
    });

    it('prefers whichever address worked last time when there is no Wi-Fi hint', () => {
        expect(
            orderServerEndpointOptions({
                lastUsedKind: 'remote',
                localUrl: LOCAL,
                remoteUrl: REMOTE,
            })[0]?.kind,
        ).toBe('remote');
    });

    // The Wi-Fi name is definitive when we have it, so it must beat history.
    it('lets a matching Wi-Fi name override the last-used address', () => {
        expect(
            orderServerEndpointOptions({
                homeSsid: 'Home',
                lastUsedKind: 'remote',
                localUrl: LOCAL,
                remoteUrl: REMOTE,
                ssid: 'Home',
            })[0]?.kind,
        ).toBe('local');
    });

    it('ignores the pin when the Wi-Fi name is unreadable and the transport is unknown', () => {
        expect(
            orderServerEndpointOptions({
                homeSsid: 'Home',
                lastUsedKind: 'remote',
                localUrl: LOCAL,
                remoteUrl: REMOTE,
                ssid: null,
            })[0]?.kind,
        ).toBe('remote');
    });

    // Reading the Wi-Fi name needs location permission on Android and is often
    // unavailable, so this is the ORDINARY case, not an edge case. History must
    // not win here: it is self-reinforcing, so one round that settled on remote
    // would otherwise keep the app remote on every network forever — streaming
    // over the internet while sitting next to the server.
    it('prefers the local address on Wi-Fi even when the name is unreadable and remote worked last', () => {
        expect(
            orderServerEndpointOptions({
                homeSsid: 'Home',
                lastUsedKind: 'remote',
                localUrl: LOCAL,
                remoteUrl: REMOTE,
                ssid: null,
                transport: 'wifi',
            })[0]?.kind,
        ).toBe('local');
    });

    it('prefers the local address on ethernet', () => {
        expect(
            orderServerEndpointOptions({
                lastUsedKind: 'remote',
                localUrl: LOCAL,
                remoteUrl: REMOTE,
                transport: 'ethernet',
            })[0]?.kind,
        ).toBe('local');
    });

    // A readable name still outranks the transport: this is a foreign Wi-Fi and
    // the LAN address provably is not on it.
    it('still puts remote first on a Wi-Fi whose name does not match the pin', () => {
        expect(
            orderServerEndpointOptions({
                homeSsid: 'Home',
                localUrl: LOCAL,
                remoteUrl: REMOTE,
                ssid: 'Cafe',
                transport: 'wifi',
            })[0]?.kind,
        ).toBe('remote');
    });

    it('drops blank slots so a one-address server probes once', () => {
        expect(orderServerEndpointOptions({ localUrl: LOCAL })).toEqual([
            { kind: 'local', url: LOCAL },
        ]);
    });

    // Same address in both slots is a normal way to configure a server that is
    // only reachable one way; probing it twice would double the wait for nothing.
    it('probes an address once even when both slots hold it', () => {
        expect(
            orderServerEndpointOptions({ localUrl: REMOTE, remoteUrl: `${REMOTE}/` }),
        ).toEqual([{ kind: 'local', url: REMOTE }]);
    });

    it('has nothing to probe for a server with no addresses', () => {
        expect(orderServerEndpointOptions({})).toEqual([]);
    });
});

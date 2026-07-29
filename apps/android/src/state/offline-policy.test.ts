import { describe, expect, it } from 'vitest';

import { deriveIsOffline, type NetworkFacts } from './offline-policy';

const facts = (overrides: Partial<NetworkFacts> = {}): NetworkFacts => ({
    activeEndpointOrigin: 'local',
    hydrated: true,
    isDeviceOnline: true,
    offlinePreference: 'auto',
    serverReachability: 'reachable',
    ssid: 'Home',
    transport: 'wifi',
    ...overrides,
});

describe('deriveIsOffline', () => {
    it('is online when the radio is up and the server answers', () => {
        expect(deriveIsOffline(facts())).toBe(false);
    });

    it('goes offline when the device has no network', () => {
        expect(deriveIsOffline(facts({ isDeviceOnline: false }))).toBe(true);
    });

    it('goes offline when the server answers on none of its addresses', () => {
        expect(deriveIsOffline(facts({ serverReachability: 'unreachable' }))).toBe(true);
    });

    // The boot state. Guessing "offline" here would flash an offline app at
    // every launch, since the first probe has not landed yet.
    it('stays online while reachability is still unknown', () => {
        expect(deriveIsOffline(facts({ serverReachability: 'unknown' }))).toBe(false);
    });

    it('honours a forced preference over a perfectly healthy connection', () => {
        expect(deriveIsOffline(facts({ offlinePreference: 'forced' }))).toBe(true);
    });

    // The escape hatch: a server that is genuinely up but fails our probe (an
    // odd reverse proxy, a captive portal) must not be able to strand the app.
    it('never goes offline on its own under the never preference', () => {
        expect(
            deriveIsOffline(
                facts({
                    isDeviceOnline: false,
                    offlinePreference: 'never',
                    serverReachability: 'unreachable',
                }),
            ),
        ).toBe(false);
    });

    it('forced beats never', () => {
        expect(deriveIsOffline(facts({ offlinePreference: 'forced' }))).toBe(true);
    });
});

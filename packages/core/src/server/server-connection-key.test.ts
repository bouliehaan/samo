import { describe, expect, it } from 'vitest';

import { ServerAuthenticationKind, type ServerAuthenticationResult } from './server-auth';
import { getDefaultServerCapabilities } from './server-capabilities';
import {
    deriveServerConnectionKey,
    findServerAuthenticationForSource,
    getServerConnectionKey,
    isSameServer,
    parseServerAuthentication,
    reconcileServerAuthentication,
    withPinnedConnectionKey,
} from './server-session';
import { ServerType } from './server-types';

const REUSED_ADDRESS = 'https://music.example.com';

const authFixture = (
    overrides: Partial<ServerAuthenticationResult> = {},
): ServerAuthenticationResult => ({
    capabilities: getDefaultServerCapabilities(),
    credential: 'token',
    details: 'test server',
    kind: ServerAuthenticationKind.SAMO_TOKEN,
    title: 'samo',
    type: ServerType.SAMO,
    url: 'https://music.example.com',
    username: 'jake',
    ...overrides,
});

describe('deriveServerConnectionKey', () => {
    it('prefers the server-issued identity over the address', () => {
        expect(deriveServerConnectionKey(authFixture({ serverId: 'srv-abc' }))).toBe(
            'samo:srv-abc',
        );
    });

    it('derives the same key for one server reached at two addresses', () => {
        const lan = deriveServerConnectionKey(
            authFixture({ serverId: 'srv-abc', url: 'http://192.168.1.10:6969' }),
        );
        const remote = deriveServerConnectionKey(
            authFixture({ serverId: 'srv-abc', url: 'https://music.example.com' }),
        );

        expect(lan).toBe(remote);
    });

    it('falls back to the address for servers that issue no identity', () => {
        expect(deriveServerConnectionKey(authFixture())).toBe('samo:https://music.example.com');
    });

    it('ignores a blank identity rather than keying by an empty string', () => {
        expect(deriveServerConnectionKey(authFixture({ serverId: '   ' }))).toBe(
            'samo:https://music.example.com',
        );
    });
});

describe('getServerConnectionKey', () => {
    it('returns the pinned key verbatim', () => {
        const key = getServerConnectionKey(
            authFixture({ connectionKey: 'samo:https://old.example.com', serverId: 'srv-abc' }),
        );

        expect(key).toBe('samo:https://old.example.com');
    });

    it('derives a key only when none is pinned', () => {
        expect(getServerConnectionKey(authFixture({ serverId: 'srv-abc' }))).toBe('samo:srv-abc');
    });
});

describe('withPinnedConnectionKey', () => {
    // The regression this guards: a server upgrade starts returning an identity,
    // the next login re-keys the connection, and every downloaded file and
    // cached catalog row on the device is suddenly filed under a key nothing
    // looks up any more.
    it('keeps the existing key when a server starts issuing identities', () => {
        const previous = authFixture({ connectionKey: 'samo:https://music.example.com' });
        const reauthenticated = authFixture({ serverId: 'srv-abc' });

        const result = withPinnedConnectionKey(reauthenticated, previous);

        expect(getServerConnectionKey(result)).toBe('samo:https://music.example.com');
    });

    it('keeps the existing key when the address changes', () => {
        const previous = authFixture({ connectionKey: 'samo:srv-abc', serverId: 'srv-abc' });
        const reauthenticated = authFixture({
            serverId: 'srv-abc',
            url: 'http://192.168.1.10:6969',
        });

        expect(getServerConnectionKey(withPinnedConnectionKey(reauthenticated, previous))).toBe(
            'samo:srv-abc',
        );
    });

    it('pins an identity-derived key for a connection seen for the first time', () => {
        const result = withPinnedConnectionKey(authFixture({ serverId: 'srv-abc' }), null);

        expect(result.connectionKey).toBe('samo:srv-abc');
    });
});

describe('parseServerAuthentication', () => {
    it('pins the address-derived key for sessions saved before keys existed', () => {
        const legacy = {
            capabilities: {},
            credential: 'token',
            kind: ServerAuthenticationKind.SAMO_TOKEN,
            title: 'samo',
            type: 'samo',
            url: 'https://music.example.com/',
            username: 'jake',
        };

        const { authentication } = parseServerAuthentication(legacy);

        expect(authentication?.connectionKey).toBe('samo:https://music.example.com');
    });

    it('does not adopt a stored identity as the key for an existing session', () => {
        const upgraded = {
            capabilities: {},
            credential: 'token',
            kind: ServerAuthenticationKind.SAMO_TOKEN,
            serverId: 'srv-abc',
            title: 'samo',
            type: 'samo',
            url: 'https://music.example.com',
            username: 'jake',
        };

        const { authentication } = parseServerAuthentication(upgraded);

        expect(authentication?.connectionKey).toBe('samo:https://music.example.com');
        expect(authentication?.serverId).toBe('srv-abc');
    });

    it('round-trips a pinned key', () => {
        const stored = {
            capabilities: {},
            connectionKey: 'samo:srv-abc',
            credential: 'token',
            kind: ServerAuthenticationKind.SAMO_TOKEN,
            serverId: 'srv-abc',
            title: 'samo',
            type: 'samo',
            url: 'http://192.168.1.10:6969',
            username: 'jake',
        };

        expect(parseServerAuthentication(stored).authentication?.connectionKey).toBe(
            'samo:srv-abc',
        );
    });
});

describe('findServerAuthenticationForSource', () => {
    it('resolves a source recorded under the address before identities existed', () => {
        const authentication = authFixture({
            connectionKey: 'samo:https://music.example.com',
            serverId: 'srv-abc',
        });

        expect(
            findServerAuthenticationForSource(authentication, {
                id: 'samo:https://music.example.com',
            }),
        ).toBe(authentication);
    });

    it('resolves a source recorded under the identity', () => {
        const authentication = authFixture({
            connectionKey: 'samo:https://music.example.com',
            serverId: 'srv-abc',
        });

        expect(findServerAuthenticationForSource(authentication, { id: 'samo:srv-abc' })).toBe(
            authentication,
        );
    });

    it('does not resolve a source belonging to a different server', () => {
        const authentication = authFixture({ serverId: 'srv-abc' });

        expect(
            findServerAuthenticationForSource(authentication, { id: 'samo:srv-different' }),
        ).toBeUndefined();
    });
});

describe('isSameServer', () => {
    it('recognises one server reached at two different addresses', () => {
        expect(
            isSameServer(
                { serverId: 'srv-abc', url: 'http://192.168.1.10:6969' },
                { serverId: 'srv-abc', url: 'https://music.example.com' },
            ),
        ).toBe(true);
    });

    it('separates two servers sharing an address', () => {
        expect(
            isSameServer(
                { serverId: 'srv-abc', url: REUSED_ADDRESS },
                { serverId: 'srv-xyz', url: REUSED_ADDRESS },
            ),
        ).toBe(false);
    });

    it('compares addresses when either side has no identity', () => {
        expect(
            isSameServer({ url: REUSED_ADDRESS }, { serverId: 'srv-abc', url: REUSED_ADDRESS }),
        ).toBe(true);
        expect(isSameServer({ url: REUSED_ADDRESS }, { url: 'https://other.example.com' })).toBe(
            false,
        );
    });
});

describe('reconcileServerAuthentication', () => {
    it('keeps the key when the same server upgrades to issuing identities', () => {
        const previous = authFixture({ connectionKey: 'samo:https://music.example.com' });
        const next = authFixture({ serverId: 'srv-abc' });

        expect(reconcileServerAuthentication(next, previous).connectionKey).toBe(
            'samo:https://music.example.com',
        );
    });

    it('keeps the key when the same server moves address', () => {
        const previous = authFixture({ connectionKey: 'samo:srv-abc', serverId: 'srv-abc' });
        const next = authFixture({ serverId: 'srv-abc', url: 'http://192.168.1.10:6969' });

        expect(reconcileServerAuthentication(next, previous).connectionKey).toBe('samo:srv-abc');
    });

    it('does not hand a different server the previous key', () => {
        const previous = authFixture({ connectionKey: 'samo:srv-abc', serverId: 'srv-abc' });
        const next = authFixture({ serverId: 'srv-xyz', url: 'https://other.example.com' });

        expect(reconcileServerAuthentication(next, previous).connectionKey).toBe('samo:srv-xyz');
    });

    it('pins a key on a first connection', () => {
        expect(
            reconcileServerAuthentication(authFixture({ serverId: 'srv-abc' })).connectionKey,
        ).toBe('samo:srv-abc');
    });
});

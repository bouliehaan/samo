import { beforeEach, describe, expect, it, vi } from 'vitest';

import { testServerAuthentication } from '../../../../packages/core/src/test-fixtures';

const mocks = vi.hoisted(() => ({
    getFetch: vi.fn(() => 'fetcher'),
    loadPersistedServerAuth: vi.fn(),
    revoke: vi.fn(),
    savePersistedServerAuths: vi.fn(),
    setOnboardingActive: vi.fn(),
}));

// Everything the session module touches besides the revoke is local state or
// the device, none of it under test here, and most of it reaches react-native.
vi.mock('@samo/core/server', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@samo/core/server')>()),
    getFetch: mocks.getFetch,
    revokeSamoCredential: mocks.revoke,
}));
vi.mock('../state/app-navigation', () => ({
    closeMediaDetail: vi.fn(),
    setActiveUtilityScreen: vi.fn(),
    setHomeContentState: vi.fn(),
    setSearchState: vi.fn(),
}));
vi.mock('../state/auth-session', () => ({
    getAuthSession: vi.fn(),
    setAuthState: vi.fn(),
    setBootResolved: vi.fn(),
    setOnboardingActive: mocks.setOnboardingActive,
    setPassword: vi.fn(),
    setServerConnection: vi.fn(),
    setServerHealthByKey: vi.fn(),
    setServerUrl: vi.fn(),
    setUsername: vi.fn(),
}));
vi.mock('../state/network-state', () => ({
    isOfflineNow: vi.fn(),
    setServerReachability: vi.fn(),
    whenNetworkHydrated: vi.fn(),
}));
vi.mock('./artwork-prefetch', () => ({ cancelCatalogArtworkPrefetch: vi.fn() }));
vi.mock('./endpoint-selection', () => ({ refreshActiveEndpoint: vi.fn() }));
vi.mock('./home-flow', () => ({ loadHomeForConnection: vi.fn() }));
vi.mock('./server-endpoints', () => ({
    ensureEndpointProfileForConnection: vi.fn(),
    forgetEndpointProfile: vi.fn(),
    loadEndpointProfiles: vi.fn(),
}));
vi.mock('./headless-catalog-sync', () => ({
    syncCatalogAuthMirror: vi.fn(),
    triggerCatalogSyncNow: vi.fn(),
}));
vi.mock('./persisted-server', async () => ({
    getPersistedServerAuthKey: (await import('@samo/core/server')).getServerConnectionKey,
    loadPersistedServerAuth: mocks.loadPersistedServerAuth,
    loadPersistedServerAuthsWithMeta: vi.fn(),
    savePersistedServerAuths: mocks.savePersistedServerAuths,
}));
vi.mock('./server-auth', () => ({ authenticateServer: vi.fn() }));
vi.mock('./server-health', () => ({
    checkAndroidServerConnection: vi.fn(),
    createCheckingServerHealthMap: vi.fn(),
    createConnectedServerHealthStatus: vi.fn(),
}));

import { acceptServerAuthentication, disconnectServer } from './server-session';

const connected = testServerAuthentication({ credential: 'phone-token', serverId: 'server-1' });

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadPersistedServerAuth.mockResolvedValue(null);
});

describe('disconnectServer', () => {
    it('revokes the session token and disconnects without waiting for the server', async () => {
        // A server that never answers.
        mocks.revoke.mockReturnValue(new Promise(() => undefined));

        await disconnectServer(connected);

        expect(mocks.revoke).toHaveBeenCalledOnce();
        expect(mocks.revoke).toHaveBeenCalledWith('fetcher', connected);
        expect(mocks.savePersistedServerAuths).toHaveBeenCalledWith([]);
        expect(mocks.setOnboardingActive).toHaveBeenCalledWith(true);
    });
});

describe('acceptServerAuthentication', () => {
    it('revokes the token of the session a sign-in replaces', async () => {
        mocks.revoke.mockResolvedValue(true);
        mocks.loadPersistedServerAuth.mockResolvedValue(connected);

        await acceptServerAuthentication(
            testServerAuthentication({ credential: 'new-token', serverId: 'server-1' }),
        );

        expect(mocks.revoke).toHaveBeenCalledOnce();
        expect(mocks.revoke).toHaveBeenCalledWith('fetcher', connected);
    });

    it('revokes nothing on a first sign-in', async () => {
        await acceptServerAuthentication(connected);

        expect(mocks.revoke).not.toHaveBeenCalled();
    });
});

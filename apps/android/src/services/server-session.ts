import {
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
    ServerType,
} from '@samo/core/server';

import { closeMediaDetail, setActiveUtilityScreen, setHomeContentState, setSearchState } from '../state/app-navigation';
import {
    getAuthSession,
    setAuthState,
    setBootResolved,
    setOnboardingActive,
    setPassword,
    setServerConnection,
    setServerHealthByKey,
    setServerUrl,
    setUsername,
} from '../state/auth-session';
import { addDefaultHttpScheme, DEFAULT_SERVER_URL, hasServerUrlTarget } from '../utils/auth-url';
import { loadHomeForConnection } from './home-flow';
import { syncCatalogAuthMirror, triggerCatalogSyncNow } from './headless-catalog-sync';
import {
    getPersistedServerAuthKey,
    loadPersistedServerAuthsWithMeta,
    savePersistedServerAuths,
} from './persisted-server';
import { authenticateServer } from './server-auth';
import {
    checkAndroidServerConnection,
    createCheckingServerHealthMap,
    createConnectedServerHealthStatus,
} from './server-health';

/**
 * Value-equality for two authentications, used to avoid pointlessly swapping
 * `serverConnection` to a fresh object on restore. The streaming-relevant
 * identity is `url`/`username`/`credential` (the token) plus `type`/`kind`; the
 * rest is descriptive. A changed `credential` is NOT equal, so a genuinely
 * refreshed token always swaps in (streaming never uses a stale one) — we only
 * collapse identity when nothing that matters changed, which is the common
 * "saved session still valid" restore. Keeping the same reference there stops a
 * new object from rotating every resolved artwork URL and remounting Home.
 */
const isSameAuthentication = (
    a: ServerAuthenticationResult | null,
    b: ServerAuthenticationResult | null,
): boolean => {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (
        a.url === b.url &&
        a.username === b.username &&
        a.credential === b.credential &&
        a.type === b.type &&
        a.kind === b.kind &&
        a.title === b.title &&
        a.details === b.details &&
        a.userId === b.userId &&
        a.isAdmin === b.isAdmin &&
        a.serverVersion === b.serverVersion
    );
};

/** True when the login form holds a plausibly-submittable target. Derived at
 *  call/render time from the auth store — no hook needed. */
export const canConnectWith = (state: {
    password: string;
    serverUrl: string;
    username: string;
}): boolean =>
    hasServerUrlTarget(state.serverUrl) &&
    state.username.trim().length > 0 &&
    state.password.length > 0;

let restoreStarted = false;

/**
 * Boot-time saved-session restore (offline-first: show the cached session
 * immediately, verify in the background). Runs once per JS lifetime — App
 * kicks it from a mount effect.
 */
export const restoreServersOnce = (): void => {
    if (restoreStarted) {
        return;
    }
    restoreStarted = true;

    const restoreServers = async () => {
        const persisted = await loadPersistedServerAuthsWithMeta();
        const persistedAuth = persisted.authentication ?? null;

        if (persisted.discardedCount > 0) {
            setAuthState({
                message:
                    persistedAuth !== null
                        ? `Ignored ${persisted.discardedCount} invalid saved server session.`
                        : 'Saved server session was invalid. Please reconnect.',
                status: 'error',
            });
        }

        if (persisted.discardedCount > 0 || persisted.migratedLegacySingle) {
            await savePersistedServerAuths(persistedAuth ? [persistedAuth] : []);
        }

        // No saved server → straight into the first-run onboarding flow.
        // `bootResolved` lifts the splash; `onboardingActive` mounts the
        // welcome → discover → connect → sync experience.
        if (!persistedAuth) {
            setOnboardingActive(true);
            setBootResolved(true);
            return;
        }

        void syncCatalogAuthMirror([persistedAuth]);

        // Show the app immediately with the cached session (offline-first):
        // lift the splash now and verify the session in the background.
        setServerConnection(persistedAuth);
        setServerHealthByKey(createCheckingServerHealthMap(persistedAuth));
        setBootResolved(true);

        const serverHealth = await checkAndroidServerConnection(persistedAuth);

        const isAuthorized = serverHealth.authentication !== null;
        const healthStatus =
            serverHealth.statuses[getPersistedServerAuthKey(persistedAuth)]?.status;

        // A genuinely expired/revoked session (401) is the one case where we
        // must NOT keep the user on a home page backed by dead credentials —
        // drop the connection and route into onboarding to reconnect. A mere
        // network blip (UNREACHABLE) keeps the cached session so offline use
        // and flaky Wi-Fi don't force a needless re-login.
        if (!isAuthorized) {
            setServerConnection(null);
            setServerHealthByKey(serverHealth.statuses);
            setAuthState({
                message: 'Your saved session expired. Please reconnect.',
                status: 'error',
            });
            await savePersistedServerAuths([]);
            setOnboardingActive(true);
            return;
        }

        // Reuse the reference we set from disk (line above) when the health
        // check came back value-equal — a brand-new object here rotates every
        // resolved artwork token and remounts the whole Home page (the
        // cold-boot "deload then reload" flash). Only a genuinely changed
        // credential swaps in.
        const nextConnection = isSameAuthentication(persistedAuth, serverHealth.authentication)
            ? persistedAuth
            : serverHealth.authentication;
        setServerConnection(nextConnection);
        setServerHealthByKey(serverHealth.statuses);

        if (healthStatus !== ServerConnectionHealthStatus.HEALTHY) {
            setAuthState({
                message: `Saved server session needs attention.`,
                status: 'error',
            });
        }

        await savePersistedServerAuths(
            serverHealth.authentication ? [serverHealth.authentication] : [],
        );
        void loadHomeForConnection(serverHealth.authentication);
    };

    void restoreServers().finally(() => {
        // Whatever happens, never leave the user stuck behind the splash.
        setBootResolved(true);
    });
};

export const connectServer = async (): Promise<void> => {
    const { authState, password, serverUrl, username } = getAuthSession();
    if (!canConnectWith({ password, serverUrl, username }) || authState.status === 'loading') {
        return;
    }

    const normalizedServerUrl = addDefaultHttpScheme(serverUrl);
    setServerUrl(normalizedServerUrl);
    setAuthState({ message: 'Connecting to server', status: 'loading' });
    setHomeContentState({ status: 'idle' });

    const nextAuthState = await authenticateServer(
        {
            password,
            type: ServerType.SAMO,
            url: normalizedServerUrl,
            username: username.trim(),
        },
        (message) => setAuthState({ message, status: 'loading' }),
    );

    setAuthState(nextAuthState);

    if (nextAuthState.status === 'connected') {
        const nextConnection = nextAuthState.result;
        const nextConnectionKey = getPersistedServerAuthKey(nextConnection);

        setServerConnection(nextConnection);
        setServerHealthByKey((current) => ({
            ...current,
            [nextConnectionKey]: createConnectedServerHealthStatus(nextConnection),
        }));
        closeMediaDetail();
        setPassword('');
        setServerUrl(DEFAULT_SERVER_URL);
        setUsername('');
        setSearchState({ status: 'idle' });
        setActiveUtilityScreen('initial-sync');
        await savePersistedServerAuths([nextConnection]);
        await loadHomeForConnection(nextConnection);

        // Kick off the on-device library mirror for the just-added source.
        // The Kotlin engine runs it (savePersistedServerAuths above already
        // pushed the auth mirror it reads); progress streams into the
        // Settings "Local library" panel and the post-sync bridge warms
        // the cover-art cache when it finishes.
        void triggerCatalogSyncNow();
    }
};

export const disconnectServer = async (
    authentication: ServerAuthenticationResult,
): Promise<void> => {
    const removedConnectionKey = getPersistedServerAuthKey(authentication);

    setServerConnection(null);
    setServerHealthByKey((current) => {
        const nextHealthByKey = { ...current };
        delete nextHealthByKey[removedConnectionKey];
        return nextHealthByKey;
    });
    closeMediaDetail();
    setSearchState({ status: 'idle' });
    setAuthState({ status: 'idle' });
    await savePersistedServerAuths([]);
    await loadHomeForConnection(null);
    // No server left → bring the user back into the onboarding flow to
    // connect another rather than stranding them on an empty home.
    setActiveUtilityScreen(null);
    setOnboardingActive(true);
};

import {
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
    ServerType,
} from '@samo/core/server';
import { useCallback, useEffect } from 'react';

import {
    syncCatalogAuthMirror,
    triggerCatalogSyncNow,
} from '../services/headless-catalog-sync';
import { type AndroidHomeContentState } from '../services/home-content';
import { authenticateServer } from '../services/server-auth';
import {
    checkAndroidServerConnection,
    createCheckingServerHealthMap,
    createConnectedServerHealthStatus,
} from '../services/server-health';
import {
    getPersistedServerAuthKey,
    loadPersistedServerAuthsWithMeta,
    savePersistedServerAuths,
} from '../services/persisted-server';
import { type AndroidSearchState } from '../services/search-content';
import { type useAuthSessionState } from '../state/auth-session';
import { type AndroidUtilityScreen } from '../types/app-navigation';
import {
    addDefaultHttpScheme,
    DEFAULT_SERVER_URL,
    hasServerUrlTarget,
} from '../utils/auth-url';

export type AndroidServerAuthSession = ReturnType<typeof useAuthSessionState>;

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

export interface UseAndroidServerAuthOptions {
    auth: AndroidServerAuthSession;
    closeMediaDetail: () => void;
    loadHomeForConnection: (authentication: ServerAuthenticationResult | null) => Promise<void>;
    setActiveUtilityScreen: (
        value:
            | AndroidUtilityScreen
            | null
            | ((current: AndroidUtilityScreen | null) => AndroidUtilityScreen | null),
    ) => void;
    setHomeContentState: (
        homeContentState:
            | AndroidHomeContentState
            | ((current: AndroidHomeContentState) => AndroidHomeContentState),
    ) => void;
    setSearchState: (
        searchState: AndroidSearchState | ((current: AndroidSearchState) => AndroidSearchState),
    ) => void;
}

export function useAndroidServerAuth(options: UseAndroidServerAuthOptions) {
    const {
        auth,
        closeMediaDetail,
        loadHomeForConnection,
        setActiveUtilityScreen,
        setHomeContentState,
        setSearchState,
    } = options;

    const {
        authState,
        password,
        serverConnection,
        serverHealthByKey,
        serverUrl,
        setAuthState,
        setBootResolved,
        setOnboardingActive,
        setPassword,
        setServerConnection,
        setServerHealthByKey,
        setServerUrl,
        setUsername,
        username,
    } = auth;

    const canConnect =
        hasServerUrlTarget(serverUrl) && username.trim().length > 0 && password.length > 0;

    useEffect(() => {
        let isMounted = true;

        const restoreServers = async () => {
            const persisted = await loadPersistedServerAuthsWithMeta();
            const persistedAuth = persisted.authentication ?? null;

            if (!isMounted) {
                return;
            }

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

            if (!isMounted) {
                return;
            }

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
            const nextConnection = isSameAuthentication(
                persistedAuth,
                serverHealth.authentication,
            )
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
            if (isMounted) {
                setBootResolved(true);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [
        loadHomeForConnection,
        setAuthState,
        setBootResolved,
        setOnboardingActive,
        setServerConnection,
        setServerHealthByKey,
    ]);

    const handleConnect = useCallback(async () => {
        if (!canConnect || authState.status === 'loading') return;

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
    }, [
        authState.status,
        canConnect,
        closeMediaDetail,
        loadHomeForConnection,
        password,
        serverConnection,
        serverUrl,
        setActiveUtilityScreen,
        setAuthState,
        setHomeContentState,
        setPassword,
        setSearchState,
        setServerConnection,
        setServerHealthByKey,
        setServerUrl,
        setUsername,
        username,
    ]);

    const handleDisconnect = useCallback(
        async (authentication: ServerAuthenticationResult) => {
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
        },
        [
            closeMediaDetail,
            loadHomeForConnection,
            setActiveUtilityScreen,
            setAuthState,
            setOnboardingActive,
            setSearchState,
            setServerConnection,
            setServerHealthByKey,
        ],
    );

    return {
        canConnect,
        handleConnect,
        handleDisconnect,
    };
}

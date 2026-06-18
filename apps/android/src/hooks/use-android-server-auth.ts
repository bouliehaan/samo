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

            if (!persistedAuth) {
                setActiveUtilityScreen('add-server');
                return;
            }

            void syncCatalogAuthMirror([persistedAuth]);

            setServerConnection(persistedAuth);
            setServerHealthByKey(createCheckingServerHealthMap(persistedAuth));

            const serverHealth = await checkAndroidServerConnection(persistedAuth);

            if (isMounted) {
                const isAuthorized = serverHealth.authentication !== null;
                const healthStatus = serverHealth.statuses[getPersistedServerAuthKey(persistedAuth)]?.status;

                setServerConnection(serverHealth.authentication);
                setServerHealthByKey(serverHealth.statuses);

                if (!isAuthorized) {
                    setAuthState({
                        message: `Saved server session expired. Please reconnect.`,
                        status: 'error',
                    });
                } else if (healthStatus !== ServerConnectionHealthStatus.HEALTHY) {
                    setAuthState({
                        message: `Saved server session needs attention.`,
                        status: 'error',
                    });
                }

                await savePersistedServerAuths(serverHealth.authentication ? [serverHealth.authentication] : []);
                void loadHomeForConnection(serverHealth.authentication);
            }
        };

        void restoreServers();

        return () => {
            isMounted = false;
        };
    }, [loadHomeForConnection, setAuthState, setServerConnection, setServerHealthByKey]);

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
        },
        [
            closeMediaDetail,
            loadHomeForConnection,
            setAuthState,
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

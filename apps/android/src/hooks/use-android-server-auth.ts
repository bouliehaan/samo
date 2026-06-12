import {
    removeServerAuthentication,
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
    ServerType,
    upsertServerAuthentication,
} from '@samo/core/server';
import { useCallback, useEffect } from 'react';

import {
    syncCatalogAuthMirror,
    triggerCatalogSyncNow,
} from '../services/headless-catalog-sync';
import { type AndroidHomeContentState } from '../services/home-content';
import { authenticateServer } from '../services/server-auth';
import {
    checkAndroidServerConnections,
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
    loadHomeForConnections: (authentications: ServerAuthenticationResult[]) => Promise<void>;
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
        loadHomeForConnections,
        setActiveUtilityScreen,
        setHomeContentState,
        setSearchState,
    } = options;

    const {
        authState,
        password,
        serverConnections,
        serverHealthByKey,
        serverUrl,
        setAuthState,
        setPassword,
        setServerConnections,
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
            const persistedAuths = persisted.authentications;

            if (!isMounted) {
                return;
            }

            if (persisted.discardedCount > 0) {
                setAuthState({
                    message:
                        persistedAuths.length > 0
                            ? `Ignored ${persisted.discardedCount} invalid saved server session.`
                            : 'Saved server session was invalid. Please reconnect.',
                    status: 'error',
                });
            }

            if (persisted.discardedCount > 0 || persisted.migratedLegacySingle) {
                await savePersistedServerAuths(persistedAuths);
            }

            if (persistedAuths.length === 0) {
                return;
            }

            // Hydrate the Kotlin auth mirror on every cold start so the
            // periodic background catalog-sync Worker has credentials
            // available even when the user hasn't re-saved connections this
            // session. savePersistedServerAuths already mirrors on every
            // explicit save; this covers the SecureStore-still-populated /
            // mirror-file-missing case (e.g. first launch after upgrading
            // to the build that introduced the mirror).
            void syncCatalogAuthMirror(persistedAuths);

            setServerConnections(persistedAuths);
            setServerHealthByKey(createCheckingServerHealthMap(persistedAuths));

            const serverHealth = await checkAndroidServerConnections(persistedAuths);

            if (isMounted) {
                const authorizedAuthentications = serverHealth.authentications.filter(
                    (authentication) =>
                        serverHealth.statuses[getPersistedServerAuthKey(authentication)]?.status !==
                        ServerConnectionHealthStatus.UNAUTHORIZED,
                );
                const authorizedHealthStatuses = Object.fromEntries(
                    Object.entries(serverHealth.statuses).filter(
                        ([, status]) => status.status !== ServerConnectionHealthStatus.UNAUTHORIZED,
                    ),
                );
                const unauthorizedCount =
                    serverHealth.authentications.length - authorizedAuthentications.length;

                setServerConnections(authorizedAuthentications);
                setServerHealthByKey(authorizedHealthStatuses);

                const unhealthySessions = Object.values(authorizedHealthStatuses).filter(
                    (status) => status.status !== ServerConnectionHealthStatus.HEALTHY,
                );

                if (unauthorizedCount > 0) {
                    setAuthState({
                        message: `${unauthorizedCount} saved server session expired. Please reconnect.`,
                        status: 'error',
                    });
                } else if (unhealthySessions.length > 0) {
                    setAuthState({
                        message: `${unhealthySessions.length} saved server session needs attention.`,
                        status: 'error',
                    });
                }

                await savePersistedServerAuths(authorizedAuthentications);
                void loadHomeForConnections(authorizedAuthentications);
            }
        };

        void restoreServers();

        return () => {
            isMounted = false;
        };
    }, [loadHomeForConnections, setAuthState, setServerConnections, setServerHealthByKey]);

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
            const nextConnections = upsertServerAuthentication(
                serverConnections,
                nextAuthState.result,
            );
            const nextConnectionKey = getPersistedServerAuthKey(nextAuthState.result);

            setServerConnections(nextConnections);
            setServerHealthByKey((current) => ({
                ...current,
                [nextConnectionKey]: createConnectedServerHealthStatus(nextAuthState.result),
            }));
            closeMediaDetail();
            setPassword('');
            setServerUrl(DEFAULT_SERVER_URL);
            setUsername('');
            setSearchState({ status: 'idle' });
            setActiveUtilityScreen('manage-servers');
            await savePersistedServerAuths(nextConnections);
            await loadHomeForConnections(nextConnections);

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
        loadHomeForConnections,
        password,
        serverConnections,
        serverUrl,
        setActiveUtilityScreen,
        setAuthState,
        setHomeContentState,
        setPassword,
        setSearchState,
        setServerConnections,
        setServerHealthByKey,
        setServerUrl,
        setUsername,
        username,
    ]);

    const handleDisconnect = useCallback(
        async (authentication: ServerAuthenticationResult) => {
            const nextConnections = removeServerAuthentication(serverConnections, authentication);
            const removedConnectionKey = getPersistedServerAuthKey(authentication);

            setServerConnections(nextConnections);
            setServerHealthByKey((current) => {
                const nextHealthByKey = { ...current };
                delete nextHealthByKey[removedConnectionKey];
                return nextHealthByKey;
            });
            closeMediaDetail();
            setSearchState({ status: 'idle' });
            setAuthState({ status: 'idle' });
            await savePersistedServerAuths(nextConnections);
            await loadHomeForConnections(nextConnections);
        },
        [
            closeMediaDetail,
            loadHomeForConnections,
            serverConnections,
            setAuthState,
            setSearchState,
            setServerConnections,
            setServerHealthByKey,
        ],
    );

    return {
        canConnect,
        handleConnect,
        handleDisconnect,
    };
}

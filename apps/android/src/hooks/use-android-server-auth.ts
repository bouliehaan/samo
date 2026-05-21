import {
    removeServerAuthentication,
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
    ServerType,
    upsertServerAuthentication,
} from '@samo/core/server';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

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
import { ANDROID_SERVER_TYPES } from '../utils/server-types';
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
        serverType,
        serverUrl,
        setAuthState,
        setPassword,
        setServerConnections,
        setServerHealthByKey,
        setServerType,
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

        const nextAuthState = await authenticateServer({
            password,
            type: serverType,
            url: normalizedServerUrl,
            username: username.trim(),
        });

        setAuthState(nextAuthState);

        if (nextAuthState.status === 'connected') {
            const connectedType = nextAuthState.result.type;
            const shouldOfferAudiobookshelfNext =
                connectedType === ServerType.NAVIDROME &&
                ANDROID_SERVER_TYPES.includes(ServerType.AUDIOBOOKSHELF);
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

            if (shouldOfferAudiobookshelfNext) {
                Alert.alert(
                    'Add Audiobookshelf?',
                    'Want to add an Audiobookshelf server too?',
                    [
                        { text: 'Not now', style: 'cancel' },
                        {
                            text: 'Add Audiobookshelf',
                            onPress: () => {
                                setAuthState({ status: 'idle' });
                                setPassword('');
                                setServerType(ServerType.AUDIOBOOKSHELF);
                                setServerUrl(DEFAULT_SERVER_URL);
                                setUsername('');
                                setActiveUtilityScreen('add-server');
                            },
                        },
                    ],
                );
            }
        }
    }, [
        authState.status,
        canConnect,
        closeMediaDetail,
        loadHomeForConnections,
        password,
        serverConnections,
        serverType,
        serverUrl,
        setActiveUtilityScreen,
        setAuthState,
        setHomeContentState,
        setPassword,
        setSearchState,
        setServerConnections,
        setServerHealthByKey,
        setServerType,
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

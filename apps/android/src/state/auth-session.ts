import { useCallback, useReducer } from 'react';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidAuthState } from '../services/server-auth';
import { type AndroidServerHealthMap } from '../services/server-health';
import { DEFAULT_SERVER_URL } from '../utils/auth-url';

export type AuthSessionState = {
    authState: AndroidAuthState;
    password: string;
    serverConnections: ServerAuthenticationResult[];
    serverHealthByKey: AndroidServerHealthMap;
    serverType: ServerType;
    serverUrl: string;
    username: string;
};

const initialAuthSessionState: AuthSessionState = {
    authState: { status: 'idle' },
    password: '',
    serverConnections: [],
    serverHealthByKey: {},
    serverType: ServerType.NAVIDROME,
    serverUrl: DEFAULT_SERVER_URL,
    username: '',
};

type AuthSessionAction =
    | { type: 'patch'; patch: Partial<AuthSessionState> }
    | { type: 'reset-credentials' }
    | { type: 'set-auth-state'; authState: AndroidAuthState }
    | { type: 'set-password'; password: string }
    | { type: 'set-server-connections'; serverConnections: ServerAuthenticationResult[] }
    | { type: 'set-server-health'; serverHealthByKey: AndroidServerHealthMap }
    | { type: 'set-server-type'; serverType: ServerType }
    | { type: 'set-server-url'; serverUrl: string }
    | { type: 'set-username'; username: string };

const authSessionReducer = (
    state: AuthSessionState,
    action: AuthSessionAction,
): AuthSessionState => {
    switch (action.type) {
        case 'patch':
            return { ...state, ...action.patch };
        case 'reset-credentials':
            return {
                ...state,
                password: '',
                serverUrl: DEFAULT_SERVER_URL,
                username: '',
            };
        case 'set-auth-state':
            return { ...state, authState: action.authState };
        case 'set-password':
            return { ...state, password: action.password };
        case 'set-server-connections':
            return { ...state, serverConnections: action.serverConnections };
        case 'set-server-health':
            return { ...state, serverHealthByKey: action.serverHealthByKey };
        case 'set-server-type':
            return { ...state, serverType: action.serverType };
        case 'set-server-url':
            return { ...state, serverUrl: action.serverUrl };
        case 'set-username':
            return { ...state, username: action.username };
        default:
            return state;
    }
};

export const useAuthSessionState = () => {
    const [state, dispatch] = useReducer(authSessionReducer, initialAuthSessionState);

    const setAuthState = useCallback(
        (authState: AndroidAuthState | ((current: AndroidAuthState) => AndroidAuthState)) => {
            dispatch({
                type: 'set-auth-state',
                authState:
                    typeof authState === 'function' ? authState(state.authState) : authState,
            });
        },
        [state.authState],
    );

    const setUsername = useCallback(
        (username: string | ((current: string) => string)) => {
            dispatch({
                type: 'set-username',
                username: typeof username === 'function' ? username(state.username) : username,
            });
        },
        [state.username],
    );

    const setPassword = useCallback(
        (password: string | ((current: string) => string)) => {
            dispatch({
                type: 'set-password',
                password: typeof password === 'function' ? password(state.password) : password,
            });
        },
        [state.password],
    );

    const setServerUrl = useCallback(
        (serverUrl: string | ((current: string) => string)) => {
            dispatch({
                type: 'set-server-url',
                serverUrl: typeof serverUrl === 'function' ? serverUrl(state.serverUrl) : serverUrl,
            });
        },
        [state.serverUrl],
    );

    const setServerType = useCallback((serverType: ServerType) => {
        dispatch({ type: 'set-server-type', serverType });
    }, []);

    const setServerConnections = useCallback(
        (
            serverConnections:
                | ServerAuthenticationResult[]
                | ((current: ServerAuthenticationResult[]) => ServerAuthenticationResult[]),
        ) => {
            dispatch({
                type: 'set-server-connections',
                serverConnections:
                    typeof serverConnections === 'function'
                        ? serverConnections(state.serverConnections)
                        : serverConnections,
            });
        },
        [state.serverConnections],
    );

    const setServerHealthByKey = useCallback(
        (
            serverHealthByKey:
                | AndroidServerHealthMap
                | ((current: AndroidServerHealthMap) => AndroidServerHealthMap),
        ) => {
            dispatch({
                type: 'set-server-health',
                serverHealthByKey:
                    typeof serverHealthByKey === 'function'
                        ? serverHealthByKey(state.serverHealthByKey)
                        : serverHealthByKey,
            });
        },
        [state.serverHealthByKey],
    );

    const patchAuthSession = useCallback((patch: Partial<AuthSessionState>) => {
        dispatch({ type: 'patch', patch });
    }, []);

    return {
        ...state,
        patchAuthSession,
        setAuthState,
        setPassword,
        setServerConnections,
        setServerHealthByKey,
        setServerType,
        setServerUrl,
        setUsername,
    };
};

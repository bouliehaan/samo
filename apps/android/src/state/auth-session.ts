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
    | {
          type: 'set-auth-state';
          value: AndroidAuthState | ((current: AndroidAuthState) => AndroidAuthState);
      }
    | { type: 'set-password'; value: string | ((current: string) => string) }
    | {
          type: 'set-server-connections';
          value:
              | ServerAuthenticationResult[]
              | ((current: ServerAuthenticationResult[]) => ServerAuthenticationResult[]);
      }
    | {
          type: 'set-server-health';
          value:
              | AndroidServerHealthMap
              | ((current: AndroidServerHealthMap) => AndroidServerHealthMap);
      }
    | { type: 'set-server-type'; serverType: ServerType }
    | { type: 'set-server-url'; value: string | ((current: string) => string) }
    | { type: 'set-username'; value: string | ((current: string) => string) };

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
        case 'set-auth-state': {
            const authState =
                typeof action.value === 'function' ? action.value(state.authState) : action.value;
            return { ...state, authState };
        }
        case 'set-password': {
            const password =
                typeof action.value === 'function' ? action.value(state.password) : action.value;
            return { ...state, password };
        }
        case 'set-server-connections': {
            const serverConnections =
                typeof action.value === 'function'
                    ? action.value(state.serverConnections)
                    : action.value;
            return { ...state, serverConnections };
        }
        case 'set-server-health': {
            const serverHealthByKey =
                typeof action.value === 'function'
                    ? action.value(state.serverHealthByKey)
                    : action.value;
            return { ...state, serverHealthByKey };
        }
        case 'set-server-type':
            return { ...state, serverType: action.serverType };
        case 'set-server-url': {
            const serverUrl =
                typeof action.value === 'function' ? action.value(state.serverUrl) : action.value;
            return { ...state, serverUrl };
        }
        case 'set-username': {
            const username =
                typeof action.value === 'function' ? action.value(state.username) : action.value;
            return { ...state, username };
        }
        default:
            return state;
    }
};

export const useAuthSessionState = () => {
    const [state, dispatch] = useReducer(authSessionReducer, initialAuthSessionState);

    const setAuthState = useCallback(
        (value: AndroidAuthState | ((current: AndroidAuthState) => AndroidAuthState)) => {
            dispatch({ type: 'set-auth-state', value });
        },
        [],
    );

    const setUsername = useCallback((value: string | ((current: string) => string)) => {
        dispatch({ type: 'set-username', value });
    }, []);

    const setPassword = useCallback((value: string | ((current: string) => string)) => {
        dispatch({ type: 'set-password', value });
    }, []);

    const setServerUrl = useCallback((value: string | ((current: string) => string)) => {
        dispatch({ type: 'set-server-url', value });
    }, []);

    const setServerType = useCallback((serverType: ServerType) => {
        dispatch({ type: 'set-server-type', serverType });
    }, []);

    const setServerConnections = useCallback(
        (
            value:
                | ServerAuthenticationResult[]
                | ((current: ServerAuthenticationResult[]) => ServerAuthenticationResult[]),
        ) => {
            dispatch({ type: 'set-server-connections', value });
        },
        [],
    );

    const setServerHealthByKey = useCallback(
        (
            value:
                | AndroidServerHealthMap
                | ((current: AndroidServerHealthMap) => AndroidServerHealthMap),
        ) => {
            dispatch({ type: 'set-server-health', value });
        },
        [],
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

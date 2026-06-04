import { useSyncExternalStore } from 'react';
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
    serverType: ServerType.SAMO,
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

// Single app-wide auth/server store. Previously a per-call `useReducer`, which
// silently gave each consumer its own copy: `use-android-abs-progress-sync`
// read `serverConnections` from a second instance that login never populated,
// so its pending-progress flush ran with an empty server list and never synced.
// A module-level store (mirroring `playback-store.ts`) keeps every consumer on
// the same state with no change to the hook's API.
let authSessionState: AuthSessionState = initialAuthSessionState;
const authSessionListeners = new Set<() => void>();

const dispatchAuthSession = (action: AuthSessionAction): void => {
    const next = authSessionReducer(authSessionState, action);
    if (Object.is(next, authSessionState)) {
        return;
    }
    authSessionState = next;
    authSessionListeners.forEach((listener) => listener());
};

const subscribeAuthSession = (listener: () => void): (() => void) => {
    authSessionListeners.add(listener);
    return () => {
        authSessionListeners.delete(listener);
    };
};

const getAuthSessionState = () => authSessionState;

// Module-level singleton setters: stable identity, shared by every consumer.
const setAuthState = (
    value: AndroidAuthState | ((current: AndroidAuthState) => AndroidAuthState),
) => dispatchAuthSession({ type: 'set-auth-state', value });

const setUsername = (value: string | ((current: string) => string)) =>
    dispatchAuthSession({ type: 'set-username', value });

const setPassword = (value: string | ((current: string) => string)) =>
    dispatchAuthSession({ type: 'set-password', value });

const setServerUrl = (value: string | ((current: string) => string)) =>
    dispatchAuthSession({ type: 'set-server-url', value });

const setServerType = (serverType: ServerType) =>
    dispatchAuthSession({ type: 'set-server-type', serverType });

const setServerConnections = (
    value:
        | ServerAuthenticationResult[]
        | ((current: ServerAuthenticationResult[]) => ServerAuthenticationResult[]),
) => dispatchAuthSession({ type: 'set-server-connections', value });

const setServerHealthByKey = (
    value: AndroidServerHealthMap | ((current: AndroidServerHealthMap) => AndroidServerHealthMap),
) => dispatchAuthSession({ type: 'set-server-health', value });

const patchAuthSession = (patch: Partial<AuthSessionState>) =>
    dispatchAuthSession({ type: 'patch', patch });

export const useAuthSessionState = () => {
    const state = useSyncExternalStore(
        subscribeAuthSession,
        getAuthSessionState,
        getAuthSessionState,
    );

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

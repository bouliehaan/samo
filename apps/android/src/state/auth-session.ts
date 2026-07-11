import { useSyncExternalStore } from 'react';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidAuthState } from '../services/server-auth';
import { type AndroidServerHealthMap } from '../services/server-health';
import { DEFAULT_SERVER_URL } from '../utils/auth-url';

export type AuthSessionState = {
    authState: AndroidAuthState;
    // Flips true the moment the saved-session decision is made at boot (a fast
    // local read). The UI shows a brief splash until then so neither the empty
    // home nor the onboarding flash before we know which one to show.
    bootResolved: boolean;
    // Drives the first-run onboarding overlay. True while the user has no server
    // (or one whose saved session expired) AND through the post-connect sync
    // step, so the celebratory flow stays mounted until "Enter Samo" is tapped.
    onboardingActive: boolean;
    password: string;
    serverConnection: ServerAuthenticationResult | null;
    serverHealthByKey: AndroidServerHealthMap;
    serverType: ServerType;
    serverUrl: string;
    username: string;
};

const initialAuthSessionState: AuthSessionState = {
    authState: { status: 'idle' },
    bootResolved: false,
    onboardingActive: false,
    password: '',
    serverConnection: null,
    serverHealthByKey: {},
    serverType: ServerType.SAMO,
    serverUrl: DEFAULT_SERVER_URL,
    username: '',
};

type AuthSessionAction =
    | { type: 'patch'; patch: Partial<AuthSessionState> }
    | { type: 'reset-credentials' }
    | { type: 'set-boot-resolved'; value: boolean }
    | { type: 'set-onboarding-active'; value: boolean }
    | {
          type: 'set-auth-state';
          value: AndroidAuthState | ((current: AndroidAuthState) => AndroidAuthState);
      }
    | { type: 'set-password'; value: string | ((current: string) => string) }
    | {
          type: 'set-server-connection';
          value:
              | ServerAuthenticationResult
              | null
              | ((current: ServerAuthenticationResult | null) => ServerAuthenticationResult | null);
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
        case 'set-boot-resolved':
            return state.bootResolved === action.value
                ? state
                : { ...state, bootResolved: action.value };
        case 'set-onboarding-active':
            return state.onboardingActive === action.value
                ? state
                : { ...state, onboardingActive: action.value };
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
        case 'set-server-connection': {
            const serverConnection =
                typeof action.value === 'function'
                    ? action.value(state.serverConnection)
                    : action.value;
            return { ...state, serverConnection };
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
// read `serverConnection` from a second instance that login never populated,
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

const setServerConnection = (
    value:
        | ServerAuthenticationResult
        | null
        | ((current: ServerAuthenticationResult | null) => ServerAuthenticationResult | null),
) => dispatchAuthSession({ type: 'set-server-connection', value });

const setServerHealthByKey = (
    value: AndroidServerHealthMap | ((current: AndroidServerHealthMap) => AndroidServerHealthMap),
) => dispatchAuthSession({ type: 'set-server-health', value });

const setBootResolved = (value: boolean) =>
    dispatchAuthSession({ type: 'set-boot-resolved', value });

const setOnboardingActive = (value: boolean) =>
    dispatchAuthSession({ type: 'set-onboarding-active', value });

const patchAuthSession = (patch: Partial<AuthSessionState>) =>
    dispatchAuthSession({ type: 'patch', patch });

/**
 * Subscribe to a single slice of the auth session. Consumers that only need
 * one field (e.g. `serverConnection`) re-render when THAT field changes, not
 * on every login-form keystroke.
 */
export const useAuthSessionSelector = <Selected>(
    selector: (state: AuthSessionState) => Selected,
): Selected =>
    useSyncExternalStore(
        subscribeAuthSession,
        () => selector(authSessionState),
        () => selector(authSessionState),
    );

// Module-level exports so event handlers can read/write auth state at call
// time without subscribing (same pattern as playback-store).
export const getAuthSession = getAuthSessionState;
export {
    patchAuthSession,
    setAuthState,
    setBootResolved,
    setOnboardingActive,
    setPassword,
    setServerConnection,
    setServerHealthByKey,
    setServerUrl,
    setUsername,
};

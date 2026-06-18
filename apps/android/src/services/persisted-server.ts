import {
    getServerConnectionKey,
    parseServerAuthentication,
    serializeServerAuthentication,
    type ServerAuthenticationParseResult,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import * as SecureStore from 'expo-secure-store';

import {
    clearCatalogAuthMirror,
    syncCatalogAuthMirror,
} from './headless-catalog-sync';
import { safeParseJson } from '../utils/json';

const SERVER_AUTH_KEY = 'samo.android.server-auth.v1';

export const clearPersistedServerAuth = async () => {
    await SecureStore.deleteItemAsync(SERVER_AUTH_KEY);
    void clearCatalogAuthMirror();
};

export const getPersistedServerAuthKey = getServerConnectionKey;

export const loadPersistedServerAuth = async (): Promise<null | ServerAuthenticationResult> => {
    const raw = await SecureStore.getItemAsync(SERVER_AUTH_KEY);

    if (!raw) {
        return null;
    }

    const parsed = safeParseJson<unknown>(raw);
    return parsed ? parseServerAuthentication(parsed).authentication ?? null : null;
};

export const loadPersistedServerAuthsWithMeta =
    async (): Promise<ServerAuthenticationParseResult> => {
        const raw = await SecureStore.getItemAsync(SERVER_AUTH_KEY);

        if (!raw) {
            return { authentication: null, discardedCount: 0, migratedLegacySingle: false };
        }

        const parsed = safeParseJson<unknown>(raw);
        return parsed 
            ? parseServerAuthentication(parsed) 
            : { authentication: null, discardedCount: 0, migratedLegacySingle: false };
    };

export const loadPersistedServerAuths = async (): Promise<ServerAuthenticationResult[]> => {
    const auth = await loadPersistedServerAuth();
    return auth ? [auth] : [];
};

export const savePersistedServerAuth = async (authentication: ServerAuthenticationResult) => {
    await SecureStore.setItemAsync(
        SERVER_AUTH_KEY,
        serializeServerAuthentication(authentication),
    );
    void syncCatalogAuthMirror([authentication]);
};

export const savePersistedServerAuths = async (authentication: ServerAuthenticationResult[]) => {
    if (authentication.length === 0) {
        await clearPersistedServerAuth();
        return;
    }
    await savePersistedServerAuth(authentication[0]);
};

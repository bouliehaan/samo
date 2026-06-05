import {
    getServerConnectionKey,
    parseServerAuthentications,
    serializeServerAuthentications,
    type ServerAuthenticationParseResult,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import * as SecureStore from 'expo-secure-store';

import {
    clearCatalogAuthMirror,
    syncCatalogAuthMirror,
} from './headless-catalog-sync';

const SERVER_AUTH_KEY = 'samo.android.server-auth.v1';

export const clearPersistedServerAuth = async () => {
    await SecureStore.deleteItemAsync(SERVER_AUTH_KEY);
    // Drop the Kotlin-readable mirror at the same time: a signed-out user's
    // tokens shouldn't outlive their SecureStore record on the background
    // sync side.
    void clearCatalogAuthMirror();
};

export const getPersistedServerAuthKey = getServerConnectionKey;

export const loadPersistedServerAuth = async (): Promise<null | ServerAuthenticationResult> => {
    const authentications = await loadPersistedServerAuths();

    return authentications[0] ?? null;
};

export const loadPersistedServerAuthsWithMeta =
    async (): Promise<ServerAuthenticationParseResult> => {
        const raw = await SecureStore.getItemAsync(SERVER_AUTH_KEY);

        if (!raw) {
            return { authentications: [], discardedCount: 0, migratedLegacySingle: false };
        }

        try {
            const parsed = JSON.parse(raw) as unknown;
            return parseServerAuthentications(parsed);
        } catch {
            return { authentications: [], discardedCount: 1, migratedLegacySingle: false };
        }
    };

export const loadPersistedServerAuths = async (): Promise<ServerAuthenticationResult[]> => {
    const result = await loadPersistedServerAuthsWithMeta();

    return result.authentications;
};

export const savePersistedServerAuth = async (authentication: ServerAuthenticationResult) => {
    await savePersistedServerAuths([authentication]);
};

export const savePersistedServerAuths = async (authentications: ServerAuthenticationResult[]) => {
    if (authentications.length === 0) {
        await clearPersistedServerAuth();
        return;
    }

    await SecureStore.setItemAsync(
        SERVER_AUTH_KEY,
        serializeServerAuthentications(authentications),
    );
    // Push the Samo entries to the Kotlin-readable mirror so the Phase 5
    // background catalog-sync Worker can mint stream tokens + hit list
    // endpoints without a running JS context. Best-effort: the next save
    // retries, and the worker no-ops on an empty mirror.
    void syncCatalogAuthMirror(authentications);
};

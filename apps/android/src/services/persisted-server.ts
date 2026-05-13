import { type ServerAuthenticationResult, ServerType } from '@samo/core/server';
import * as SecureStore from 'expo-secure-store';

const SERVER_AUTH_KEY = 'samo.android.server-auth.v1';

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const isPersistedServerAuthenticationResult = (
    value: unknown,
): value is ServerAuthenticationResult => {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.credential === 'string' &&
        typeof value.title === 'string' &&
        Object.values(ServerType).includes(value.type as ServerType) &&
        typeof value.url === 'string' &&
        typeof value.username === 'string'
    );
};

export const clearPersistedServerAuth = async () => {
    await SecureStore.deleteItemAsync(SERVER_AUTH_KEY);
};

export const getPersistedServerAuthKey = (authentication: ServerAuthenticationResult) => {
    return `${authentication.type}:${authentication.url}`;
};

const dedupeServerAuthentications = (authentications: ServerAuthenticationResult[]) => {
    const byKey = new Map<string, ServerAuthenticationResult>();

    authentications.forEach((authentication) => {
        byKey.set(getPersistedServerAuthKey(authentication), authentication);
    });

    return [...byKey.values()];
};

const parsePersistedServerAuthentications = (value: unknown) => {
    if (Array.isArray(value)) {
        return dedupeServerAuthentications(value.filter(isPersistedServerAuthenticationResult));
    }

    return isPersistedServerAuthenticationResult(value) ? [value] : [];
};

export const loadPersistedServerAuth = async (): Promise<null | ServerAuthenticationResult> => {
    const authentications = await loadPersistedServerAuths();

    return authentications[0] ?? null;
};

export const loadPersistedServerAuths = async (): Promise<ServerAuthenticationResult[]> => {
    const raw = await SecureStore.getItemAsync(SERVER_AUTH_KEY);

    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        return parsePersistedServerAuthentications(parsed);
    } catch {
        return [];
    }
};

export const savePersistedServerAuth = async (authentication: ServerAuthenticationResult) => {
    await savePersistedServerAuths([authentication]);
};

export const savePersistedServerAuths = async (authentications: ServerAuthenticationResult[]) => {
    await SecureStore.setItemAsync(
        SERVER_AUTH_KEY,
        JSON.stringify(dedupeServerAuthentications(authentications)),
    );
};

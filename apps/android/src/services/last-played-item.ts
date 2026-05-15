import { type MobilePlayableAudio } from '@samo/core/mobile';
import * as SecureStore from 'expo-secure-store';

const LAST_PLAYED_KEY = 'samo.android.last-played-item.v1';

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const isPersistedLastPlayedItem = (value: unknown): value is MobilePlayableAudio => {
    if (!isRecord(value) || !isRecord(value.quality)) {
        return false;
    }

    return (
        typeof value.id === 'string' &&
        typeof value.title === 'string' &&
        typeof value.url === 'string' &&
        typeof value.source === 'string'
    );
};

export const loadPersistedLastPlayedItem = async (): Promise<MobilePlayableAudio | null> => {
    const raw = await SecureStore.getItemAsync(LAST_PLAYED_KEY);

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        return isPersistedLastPlayedItem(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

export const savePersistedLastPlayedItem = async (item: MobilePlayableAudio) => {
    await SecureStore.setItemAsync(LAST_PLAYED_KEY, JSON.stringify(item));
};

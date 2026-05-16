import { fsGetItem, fsSetItem } from './fs-storage';

const KEY = 'samo.android.offline-mode.v1';

export const loadOfflineModePreference = async (): Promise<boolean> => {
    try {
        const raw = await fsGetItem(KEY);
        return raw === 'true';
    } catch {
        return false;
    }
};

export const saveOfflineModePreference = async (enabled: boolean): Promise<void> => {
    try {
        await fsSetItem(KEY, enabled ? 'true' : 'false');
    } catch {
        // best-effort
    }
};

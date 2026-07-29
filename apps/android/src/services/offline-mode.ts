import { fsGetItem, fsSetItem } from './fs-storage';
import { type OfflinePreference } from '../state/offline-policy';

const KEY = 'samo.android.offline-mode.v2';
/** The v1 boolean this replaced. `true` meant "the user forced offline". */
const LEGACY_KEY = 'samo.android.offline-mode.v1';

const isOfflinePreference = (value: unknown): value is OfflinePreference =>
    value === 'auto' || value === 'forced' || value === 'never';

export const loadOfflinePreference = async (): Promise<OfflinePreference> => {
    try {
        const raw = await fsGetItem(KEY);
        if (isOfflinePreference(raw)) {
            return raw;
        }
        // Nothing at the new key: carry the old switch forward once so a user
        // who left offline mode on does not silently come back online.
        const legacy = await fsGetItem(LEGACY_KEY);
        return legacy === 'true' ? 'forced' : 'auto';
    } catch {
        return 'auto';
    }
};

export const saveOfflinePreference = async (preference: OfflinePreference): Promise<void> => {
    try {
        await fsSetItem(KEY, preference);
    } catch {
        // best-effort
    }
};

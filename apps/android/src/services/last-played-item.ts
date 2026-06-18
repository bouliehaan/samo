import { type MobilePlayableAudio } from '@samo/core/mobile';
import { NativeModules } from 'react-native';

import { fsGetItem, fsSetItem } from './fs-storage';
import { safeParseJson } from '../utils/json';

// Persistence used to live in fs-storage (a JSON blob in
// `samo.android.last-played-item.v2`). The JS write was best-effort and
// occasionally dropped: a bundle reload during dev, a hard-restart from the
// quick settings tile, or a process kill before the write flushed would all
// leave the file behind with stale contents — surfacing as "I closed Samo
// and it forgot what I was listening to."
//
// Native SharedPreferences gives us a synchronous-write-back store that
// survives bundle reloads + process death. We keep the legacy fs-storage key
// around so a user on the freshly upgraded build still sees their last item
// on first launch; subsequent saves go straight to native.

const LEGACY_KEY = 'samo.android.last-played-item.v2';

interface SamoLastPlayedNative {
    clear(): Promise<void>;
    load(): Promise<MobilePlayableAudio | null>;
    save(item: MobilePlayableAudio): Promise<void>;
}

const native: SamoLastPlayedNative | undefined =
    (NativeModules as Record<string, unknown>).SamoLastPlayed as
        | SamoLastPlayedNative
        | undefined;

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
    if (native) {
        try {
            const fromNative = await native.load();
            if (isPersistedLastPlayedItem(fromNative)) {
                return fromNative;
            }
        } catch {
            // fall through to legacy
        }
        // First launch on the native-backed build: the native store is empty
        // but the legacy fs-storage key may still have something. Migrate it
        // forward so a returning user sees their last item.
        const legacy = await loadLegacy();
        if (legacy) {
            try {
                await native.save(legacy);
            } catch {
                // best-effort
            }
            return legacy;
        }
        return null;
    }
    return loadLegacy();
};

export const savePersistedLastPlayedItem = async (item: MobilePlayableAudio) => {
    if (native) {
        try {
            await native.save(item);
            return;
        } catch {
            // fall through to legacy
        }
    }
    await fsSetItem(LEGACY_KEY, JSON.stringify(item));
};

const loadLegacy = async (): Promise<MobilePlayableAudio | null> => {
    const raw = await fsGetItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = safeParseJson<unknown>(raw);
    return isPersistedLastPlayedItem(parsed) ? parsed : null;
};

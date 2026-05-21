import { del, get, set } from 'idb-keyval';
import mergeWith from 'lodash/mergeWith';
import { logFn } from '/@/renderer/utils/logger';
let playerStoreHydratedForPersistence = false;
export function cleanQueueForPersistence(queue) {
    const allQueueIds = new Set(queue.default || []);
    const songs = queue.songs || {};
    const cleanedSongs = {};
    for (const [id, song] of Object.entries(songs)) {
        if (allQueueIds.has(id)) {
            cleanedSongs[id] = song;
        }
    }
    return {
        ...queue,
        songs: cleanedSongs,
    };
}
// Migrate from v3 to v4 to handle queue migration
export async function migratePlayerStorePersist(storeName) {
    const mainRaw = await get(storeName);
    if (!mainRaw) {
        return;
    }
    let parsed;
    try {
        parsed = JSON.parse(mainRaw);
    }
    catch {
        return;
    }
    const embeddedQueue = parsed.state?.queue;
    if (embeddedQueue === undefined) {
        return;
    }
    const queueKey = `${storeName}-queue`;
    const queueSeparateRaw = await get(queueKey);
    if (!queueSeparateRaw) {
        const cleaned = cleanQueueForPersistence(embeddedQueue);
        await set(queueKey, JSON.stringify(cleaned));
    }
    await set(storeName, JSON.stringify({
        state: { player: parsed.state?.player },
        version: parsed.version,
    }));
}
export function setPlayerStoreHydratedForPersistence(value) {
    playerStoreHydratedForPersistence = value;
}
function hasStructuredPersistedMusicContext(player) {
    if (!player || typeof player !== 'object')
        return false;
    const context = player.context;
    // Legacy persisted queues predate playback context. Allow those through so older
    // users do not silently lose their saved queue during the v4 migration path.
    if (!context || typeof context !== 'object')
        return true;
    const kind = context.kind;
    return kind === 'album' || kind === 'playlist';
}
function playerStoreQueueKey(storeName) {
    return `${storeName}-queue`;
}
let lastPersistedPlayerQueueRef;
export const playerStoreStorage = {
    getItem: async (name) => {
        const mainRaw = await get(name);
        if (!mainRaw) {
            return null;
        }
        let parsed;
        try {
            parsed = JSON.parse(mainRaw);
        }
        catch {
            return null;
        }
        const version = parsed.version;
        let queue;
        const queueRaw = await get(playerStoreQueueKey(name));
        if (queueRaw && hasStructuredPersistedMusicContext(parsed.state?.player)) {
            try {
                queue = JSON.parse(queueRaw);
            }
            catch {
                queue = undefined;
            }
        }
        else if (parsed.state?.queue &&
            hasStructuredPersistedMusicContext(parsed.state?.player)) {
            // Fallback to legacy format if queue is not found
            queue = parsed.state.queue;
        }
        return {
            state: {
                player: parsed.state?.player,
                queue,
            },
            version,
        };
    },
    removeItem: async (name) => {
        lastPersistedPlayerQueueRef = undefined;
        await del(name);
        await del(playerStoreQueueKey(name));
    },
    setItem: async (name, value) => {
        if (!playerStoreHydratedForPersistence) {
            return;
        }
        const { state: rawState, version } = value;
        const state = rawState;
        const player = state.player;
        await set(name, JSON.stringify({
            state: { player },
            version,
        }));
        if (state.queue === undefined) {
            lastPersistedPlayerQueueRef = undefined;
            await del(playerStoreQueueKey(name));
            return;
        }
        if (state.queue === lastPersistedPlayerQueueRef) {
            return;
        }
        const cleaned = cleanQueueForPersistence(state.queue);
        await set(playerStoreQueueKey(name), JSON.stringify(cleaned));
        lastPersistedPlayerQueueRef = state.queue;
    },
};
/**
 * A custom deep merger that will replace all 'columns' items with the persistent
 * state, instead of the default merge behavior. This is important to preserve the user's
 * order, and not lead to an inconsistent state (e.g. multiple 'Favorite' keys)
 * @param persistedState the persistent state
 * @param currentState the current state
 * @returns the a custom deep merge
 */
export const mergeOverridingColumns = (persistedState, currentState) => {
    return mergeWith(currentState, persistedState, (_original, persistent, key) => {
        if (key === 'columns') {
            return persistent;
        }
        return undefined;
    });
};
export const idbStateStorage = {
    getItem: async (name) => {
        return (await get(name)) || null;
    },
    removeItem: async (name) => {
        await del(name);
    },
    setItem: async (name, value) => {
        await set(name, value);
    },
};
const settingsKeys = [
    'store_settings_autoDJ',
    'store_settings_general',
    'store_settings_lists',
    'store_settings_hotkeys',
    'store_settings_playback',
    'store_settings_lyrics',
    'store_settings_window',
    'store_settings_discord',
    'store_settings_font',
    'store_settings_css',
    'store_settings_remote',
    'store_settings_queryBuilder',
    'store_settings_tab',
];
export const splitSettingsStorage = {
    getItem: (name) => {
        if (name !== 'store_settings') {
            return localStorage.getItem(name);
        }
        // Read from all split keys and merge them
        const keys = settingsKeys;
        // Check if old single key exists (for migration)
        const oldKeyRaw = localStorage.getItem('store_settings');
        if (oldKeyRaw && !localStorage.getItem('store_settings_general')) {
            // Only migrate if split keys don't exist yet
            try {
                const oldData = JSON.parse(oldKeyRaw);
                const splitData = {};
                const state = oldData.state || oldData;
                if (state && typeof state === 'object') {
                    splitData.general = state.general;
                    splitData.lists = state.lists;
                    splitData.hotkeys = state.hotkeys;
                    splitData.playback = state.playback;
                    splitData.lyrics = state.lyrics;
                    splitData.window = state.window;
                    splitData.discord = state.discord;
                    splitData.font = state.font;
                    splitData.css = state.css;
                    splitData.remote = state.remote;
                    splitData.queryBuilder = state.queryBuilder;
                    splitData.tab = state.tab;
                    // Save to new split keys
                    keys.forEach((key) => {
                        const keyName = key.replace('store_settings_', '');
                        if (splitData[keyName] !== undefined) {
                            localStorage.setItem(key, JSON.stringify(splitData[keyName]));
                        }
                    });
                    // Store version if it exists
                    if (oldData.version !== undefined) {
                        localStorage.setItem('store_settings_version', oldData.version.toString());
                    }
                }
            }
            catch (e) {
                // If parsing fails, continue with reading from split keys
                logFn.warn('Failed to migrate old settings format', { meta: { error: e } });
            }
        }
        // Read from all split keys
        const mergedState = {};
        let hasData = false;
        keys.forEach((key) => {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    const keyName = key.replace('store_settings_', '');
                    mergedState[keyName] = JSON.parse(value);
                    hasData = true;
                }
                catch (e) {
                    logFn.warn(`Failed to parse ${key}`, { meta: { error: e } });
                }
            }
        });
        if (!hasData) {
            return null;
        }
        const versionKey = localStorage.getItem('store_settings_version');
        const version = versionKey ? parseInt(versionKey, 10) : 14;
        return JSON.stringify({
            state: mergedState,
            version,
        });
    },
    removeItem: (name) => {
        if (name !== 'store_settings') {
            localStorage.removeItem(name);
            return;
        }
        // Remove all split keys
        const keys = settingsKeys;
        keys.forEach((key) => {
            localStorage.removeItem(key);
        });
        // Also remove old key if it exists
        localStorage.removeItem('store_settings');
    },
    setItem: (name, value) => {
        if (name !== 'store_settings') {
            localStorage.setItem(name, value);
            return;
        }
        try {
            const data = JSON.parse(value);
            const state = data.state || data;
            const keys = settingsKeys.map((key) => ({
                key,
                value: state[key],
            }));
            keys.forEach(({ key, value: keyValue }) => {
                if (keyValue !== undefined) {
                    localStorage.setItem(key, JSON.stringify(keyValue));
                }
            });
            // Store version separately
            if (data.version !== undefined) {
                localStorage.setItem('store_settings_version', data.version.toString());
            }
        }
        catch (e) {
            logFn.error('Failed to split settings storage', { meta: { error: e } });
            localStorage.setItem(name, value);
        }
    },
};

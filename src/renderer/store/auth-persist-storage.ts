import type { StateStorage } from 'zustand/middleware';
import isElectron from 'is-electron';

/**
 * Renderer localStorage can fail in Electron dev (LOCK / profile corruption).
 * Persist auth through main-process electron-store instead.
 */
export const authPersistStorage: StateStorage = {
    getItem: async (name) => {
        if (isElectron() && window.api?.localSettings?.authPersistGet) {
            const fromDisk = await window.api.localSettings.authPersistGet(name);

            if (fromDisk) {
                return fromDisk;
            }

            try {
                const legacy = localStorage.getItem(name);

                if (legacy) {
                    await window.api.localSettings.authPersistSet(name, legacy);
                    return legacy;
                }
            } catch {
                // localStorage unavailable (LOCK errors)
            }

            return null;
        }

        try {
            return localStorage.getItem(name);
        } catch {
            return null;
        }
    },
    removeItem: async (name) => {
        if (isElectron() && window.api?.localSettings?.authPersistRemove) {
            await window.api.localSettings.authPersistRemove(name);
            return;
        }

        try {
            localStorage.removeItem(name);
        } catch {
            // ignore
        }
    },
    setItem: async (name, value) => {
        if (isElectron() && window.api?.localSettings?.authPersistSet) {
            await window.api.localSettings.authPersistSet(name, value);
            return;
        }

        try {
            localStorage.setItem(name, value);
        } catch {
            // ignore
        }
    },
};

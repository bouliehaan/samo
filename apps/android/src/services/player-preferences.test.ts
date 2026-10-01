import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
    getItemSync: vi.fn(),
    setItemSync: vi.fn(),
}));
vi.mock('expo-sqlite/kv-store', () => ({ default: storage }));

beforeEach(() => {
    vi.resetModules();
    storage.getItemSync.mockReset();
    storage.setItemSync.mockReset();
});

describe('player artwork preference', () => {
    it.each([null, 'unknown', 'framed'])('uses framed artwork for %s', async (stored) => {
        storage.getItemSync.mockReturnValue(stored);
        const { getPlayerArtworkMode } = await import('./player-preferences');
        expect(getPlayerArtworkMode()).toBe('framed');
    });

    it('restores the last choice after an app restart, including rapid switches', async () => {
        let saved: string | null = null;
        storage.getItemSync.mockImplementation(() => saved);
        storage.setItemSync.mockImplementation((_key, value) => { saved = value; });
        const { getPlayerArtworkMode, savePlayerArtworkMode } = await import('./player-preferences');
        expect(getPlayerArtworkMode()).toBe('framed');
        savePlayerArtworkMode('immersive');
        savePlayerArtworkMode('framed');
        savePlayerArtworkMode('immersive');
        expect(getPlayerArtworkMode()).toBe('immersive');

        vi.resetModules();
        const restarted = await import('./player-preferences');
        expect(restarted.getPlayerArtworkMode()).toBe('immersive');
        restarted.savePlayerArtworkMode('framed');
        vi.resetModules();
        expect((await import('./player-preferences')).getPlayerArtworkMode()).toBe('framed');
    });

    it('keeps the player usable and remembers the session choice if storage fails', async () => {
        storage.getItemSync.mockImplementation(() => { throw new Error('Unavailable'); });
        storage.setItemSync.mockImplementation(() => { throw new Error('Disk full'); });
        const { getPlayerArtworkMode, savePlayerArtworkMode } = await import('./player-preferences');
        expect(getPlayerArtworkMode()).toBe('framed');
        savePlayerArtworkMode('immersive');
        expect(getPlayerArtworkMode()).toBe('immersive');
    });
});

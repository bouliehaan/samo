import Storage from 'expo-sqlite/kv-store';

export type PlayerArtworkMode = 'framed' | 'immersive';

const ARTWORK_MODE_KEY = 'samo.player.artwork-mode.v1';
let artworkMode: PlayerArtworkMode | undefined;

// Preferences belong in durable storage, outside the artwork/cache pruning path.
// Read before the first paint so reopening never flashes the default mode.
export const getPlayerArtworkMode = (): PlayerArtworkMode => {
    if (artworkMode) return artworkMode;
    try {
        artworkMode = Storage.getItemSync(ARTWORK_MODE_KEY) === 'immersive'
            ? 'immersive'
            : 'framed';
    } catch {
        artworkMode = 'framed';
    }
    return artworkMode;
};

export const savePlayerArtworkMode = (mode: PlayerArtworkMode): void => {
    artworkMode = mode;
    try {
        // A tiny synchronous preference write keeps rapid taps ordered and is
        // committed even if the app is closed immediately after switching.
        Storage.setItemSync(ARTWORK_MODE_KEY, mode);
    } catch {
        // Keep the chosen mode for this session if device storage is unavailable.
    }
};

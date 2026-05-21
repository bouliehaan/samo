import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { identityPersistMigrate, PERSIST_VERSION_INITIAL, } from '/@/renderer/store/persist-migrate';
const buildKey = (serverId, itemId) => `${serverId}:${itemId}`;
const bucketField = (type) => type === 'audiobook'
    ? 'audiobookKeys'
    : type === 'playlist'
        ? 'playlistKeys'
        : type === 'podcast'
            ? 'podcastKeys'
            : 'radioKeys';
export const useLibraryFavoritesStore = create()(persist((set, get) => ({
    actions: {
        clear: (type, serverId) => set((state) => {
            const field = bucketField(type);
            if (!serverId) {
                return { ...state, [field]: {} };
            }
            const next = {};
            const prefix = `${serverId}:`;
            for (const key of Object.keys(state[field])) {
                if (!key.startsWith(prefix))
                    next[key] = true;
            }
            return { ...state, [field]: next };
        }),
        isFavorite: (type, serverId, itemId) => {
            if (!serverId || !itemId)
                return false;
            return Boolean(get()[bucketField(type)][buildKey(serverId, itemId)]);
        },
        toggle: (type, serverId, itemId) => {
            if (!serverId || !itemId)
                return false;
            const field = bucketField(type);
            const key = buildKey(serverId, itemId);
            const current = get()[field];
            const isFav = Boolean(current[key]);
            if (isFav) {
                const next = { ...current };
                delete next[key];
                set({ [field]: next });
                return false;
            }
            set({
                [field]: { ...current, [key]: true },
            });
            return true;
        },
    },
    audiobookKeys: {},
    playlistKeys: {},
    podcastKeys: {},
    radioKeys: {},
}), {
    migrate: (identityPersistMigrate),
    name: 'library-favorites-store',
    partialize: (state) => ({
        audiobookKeys: state.audiobookKeys,
        playlistKeys: state.playlistKeys,
        podcastKeys: state.podcastKeys,
        radioKeys: state.radioKeys,
    }),
    version: PERSIST_VERSION_INITIAL,
}));
export const useLibraryFavoritesActions = () => useLibraryFavoritesStore((state) => state.actions);
const useFavoriteIdSet = (type, serverId) => {
    const field = bucketField(type);
    const bucket = useLibraryFavoritesStore((state) => state[field]);
    return useMemo(() => {
        if (!serverId)
            return new Set();
        const ids = new Set();
        const prefix = `${serverId}:`;
        for (const key of Object.keys(bucket)) {
            if (key.startsWith(prefix))
                ids.add(key.slice(prefix.length));
        }
        return ids;
    }, [bucket, serverId]);
};
export const useFavoriteRadioStationIds = (serverId) => useFavoriteIdSet('radio', serverId);
export const useFavoriteAudiobookIds = (serverId) => useFavoriteIdSet('audiobook', serverId);
export const useFavoritePlaylistIds = (serverId) => useFavoriteIdSet('playlist', serverId);
export const useFavoritePodcastIds = (serverId) => useFavoriteIdSet('podcast', serverId);
export const useIsLibraryFavorite = (type, serverId, itemId) => {
    const field = bucketField(type);
    return useLibraryFavoritesStore((state) => serverId && itemId ? Boolean(state[field][buildKey(serverId, itemId)]) : false);
};

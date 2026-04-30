import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Local favorites for media types whose backends do not expose a first-class
// "favorite" concept (Audiobookshelf books/podcasts) or where we deliberately
// keep them client-side (radio stations) so the home page surfaces what *this
// user* cares about, not the entire library. Music album/artist/song favorites
// continue to flow through Subsonic `star`/`unstar`.

export type LibraryFavoriteType = 'audiobook' | 'podcast' | 'radio';

const buildKey = (serverId: string, itemId: string) => `${serverId}:${itemId}`;

interface LibraryFavoritesState {
    actions: {
        clear: (type: LibraryFavoriteType, serverId?: string) => void;
        isFavorite: (type: LibraryFavoriteType, serverId: string, itemId: string) => boolean;
        toggle: (type: LibraryFavoriteType, serverId: string, itemId: string) => boolean;
    };
    audiobookKeys: Record<string, true>;
    podcastKeys: Record<string, true>;
    radioKeys: Record<string, true>;
}

const bucketField = (type: LibraryFavoriteType) =>
    type === 'audiobook'
        ? ('audiobookKeys' as const)
        : type === 'podcast'
          ? ('podcastKeys' as const)
          : ('radioKeys' as const);

export const useLibraryFavoritesStore = create<LibraryFavoritesState>()(
    persist(
        (set, get) => ({
            actions: {
                clear: (type, serverId) =>
                    set((state) => {
                        const field = bucketField(type);
                        if (!serverId) {
                            return { ...state, [field]: {} } as LibraryFavoritesState;
                        }
                        const next: Record<string, true> = {};
                        const prefix = `${serverId}:`;
                        for (const key of Object.keys(state[field])) {
                            if (!key.startsWith(prefix)) next[key] = true;
                        }
                        return { ...state, [field]: next } as LibraryFavoritesState;
                    }),
                isFavorite: (type, serverId, itemId) => {
                    if (!serverId || !itemId) return false;
                    return Boolean(get()[bucketField(type)][buildKey(serverId, itemId)]);
                },
                toggle: (type, serverId, itemId) => {
                    if (!serverId || !itemId) return false;
                    const field = bucketField(type);
                    const key = buildKey(serverId, itemId);
                    const current = get()[field];
                    const isFav = Boolean(current[key]);
                    if (isFav) {
                        const next = { ...current };
                        delete next[key];
                        set({ [field]: next } as Partial<LibraryFavoritesState>);
                        return false;
                    }
                    set({
                        [field]: { ...current, [key]: true },
                    } as Partial<LibraryFavoritesState>);
                    return true;
                },
            },
            audiobookKeys: {},
            podcastKeys: {},
            radioKeys: {},
        }),
        {
            name: 'library-favorites-store',
            partialize: (state) => ({
                audiobookKeys: state.audiobookKeys,
                podcastKeys: state.podcastKeys,
                radioKeys: state.radioKeys,
            }),
            version: 1,
        },
    ),
);

export const useLibraryFavoritesActions = () => useLibraryFavoritesStore((state) => state.actions);

const useFavoriteIdSet = (type: LibraryFavoriteType, serverId: null | string | undefined) => {
    const field = bucketField(type);
    const bucket = useLibraryFavoritesStore((state) => state[field]);
    return useMemo(() => {
        if (!serverId) return new Set<string>();
        const ids = new Set<string>();
        const prefix = `${serverId}:`;
        for (const key of Object.keys(bucket)) {
            if (key.startsWith(prefix)) ids.add(key.slice(prefix.length));
        }
        return ids;
    }, [bucket, serverId]);
};

export const useFavoriteRadioStationIds = (serverId: null | string | undefined) =>
    useFavoriteIdSet('radio', serverId);

export const useFavoriteAudiobookIds = (serverId: null | string | undefined) =>
    useFavoriteIdSet('audiobook', serverId);

export const useFavoritePodcastIds = (serverId: null | string | undefined) =>
    useFavoriteIdSet('podcast', serverId);

export const useIsLibraryFavorite = (
    type: LibraryFavoriteType,
    serverId: null | string | undefined,
    itemId: null | string | undefined,
) => {
    const field = bucketField(type);
    return useLibraryFavoritesStore((state) =>
        serverId && itemId ? Boolean(state[field][buildKey(serverId, itemId)]) : false,
    );
};

export type LibraryFavoriteType = 'audiobook' | 'playlist' | 'podcast' | 'radio';
interface LibraryFavoritesState {
    actions: {
        clear: (type: LibraryFavoriteType, serverId?: string) => void;
        isFavorite: (type: LibraryFavoriteType, serverId: string, itemId: string) => boolean;
        toggle: (type: LibraryFavoriteType, serverId: string, itemId: string) => boolean;
    };
    audiobookKeys: Record<string, true>;
    playlistKeys: Record<string, true>;
    podcastKeys: Record<string, true>;
    radioKeys: Record<string, true>;
}
export declare const useLibraryFavoritesStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<LibraryFavoritesState>, "setState" | "persist"> & {
    setState(partial: LibraryFavoritesState | Partial<LibraryFavoritesState> | ((state: LibraryFavoritesState) => LibraryFavoritesState | Partial<LibraryFavoritesState>), replace?: false | undefined): unknown;
    setState(state: LibraryFavoritesState | ((state: LibraryFavoritesState) => LibraryFavoritesState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<LibraryFavoritesState, {
            audiobookKeys: Record<string, true>;
            playlistKeys: Record<string, true>;
            podcastKeys: Record<string, true>;
            radioKeys: Record<string, true>;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: LibraryFavoritesState) => void) => () => void;
        onFinishHydration: (fn: (state: LibraryFavoritesState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<LibraryFavoritesState, {
            audiobookKeys: Record<string, true>;
            playlistKeys: Record<string, true>;
            podcastKeys: Record<string, true>;
            radioKeys: Record<string, true>;
        }, unknown>>;
    };
}>;
export declare const useLibraryFavoritesActions: () => {
    clear: (type: LibraryFavoriteType, serverId?: string) => void;
    isFavorite: (type: LibraryFavoriteType, serverId: string, itemId: string) => boolean;
    toggle: (type: LibraryFavoriteType, serverId: string, itemId: string) => boolean;
};
export declare const useFavoriteRadioStationIds: (serverId: null | string | undefined) => Set<string>;
export declare const useFavoriteAudiobookIds: (serverId: null | string | undefined) => Set<string>;
export declare const useFavoritePlaylistIds: (serverId: null | string | undefined) => Set<string>;
export declare const useFavoritePodcastIds: (serverId: null | string | undefined) => Set<string>;
export declare const useIsLibraryFavorite: (type: LibraryFavoriteType, serverId: null | string | undefined, itemId: null | string | undefined) => boolean;
export {};

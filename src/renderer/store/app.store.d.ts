import type { ItemListStateItem } from '/@/renderer/components/item-list/helpers/item-list-state';
import type { LibraryItem } from '/@/shared/types/domain-types';
import { AlbumListSort, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { Platform } from '/@/shared/types/types';
export interface AppSlice extends AppState {
    actions: {
        setAlbumArtistDetailFavoriteSongsSort: (sortBy: SongListSort, sortOrder: SortOrder) => void;
        setAlbumArtistDetailGroupingType: (groupingType: 'all' | 'primary') => void;
        setAlbumArtistDetailSort: (sortBy: AlbumListSort, sortOrder: SortOrder) => void;
        setAlbumArtistIdsMode: (mode: 'and' | 'or') => void;
        setAlbumArtistSelectMode: (mode: 'multi' | 'single') => void;
        setAppStore: (data: Partial<AppSlice>) => void;
        setArtistIdsMode: (mode: 'and' | 'or') => void;
        setArtistSelectMode: (mode: 'multi' | 'single') => void;
        setCommandPaletteSearchSectionExpanded: (sectionId: string, expanded: boolean) => void;
        setGenreIdsMode: (mode: 'and' | 'or') => void;
        setGenreSelectMode: (mode: 'multi' | 'single') => void;
        setGlobalExpanded: (value: GlobalExpandedState | null) => void;
        setPageSidebar: (key: string, value: boolean) => void;
        setPrivateMode: (enabled: boolean) => void;
        setShowTimeRemaining: (enabled: boolean) => void;
        setSideBar: (options: Partial<SidebarProps>) => void;
        setTitleBar: (options: Partial<TitlebarProps>) => void;
    };
}
export interface AppState {
    albumArtistDetailFavoriteSongsSort: {
        sortBy: SongListSort;
        sortOrder: SortOrder;
    };
    albumArtistDetailSort: {
        groupingType: 'all' | 'primary';
        sortBy: AlbumListSort;
        sortOrder: SortOrder;
    };
    albumArtistIdsMode: 'and' | 'or';
    albumArtistSelectMode: 'multi' | 'single';
    artistIdsMode: 'and' | 'or';
    artistSelectMode: 'multi' | 'single';
    commandPalette: CommandPaletteProps;
    commandPaletteSearchSectionsExpanded: Record<string, boolean>;
    genreIdsMode: 'and' | 'or';
    genreSelectMode: 'multi' | 'single';
    globalExpanded: GlobalExpandedState | null;
    isReorderingQueue: boolean;
    pageSidebar: Record<string, boolean>;
    platform: Platform;
    privateMode: boolean;
    showTimeRemaining: boolean;
    sidebar: SidebarProps;
    titlebar: TitlebarProps;
}
export interface GlobalExpandedState {
    item: ItemListStateItem;
    itemType: LibraryItem;
}
type CommandPaletteProps = {
    close: () => void;
    open: () => void;
    opened: boolean;
    toggle: () => void;
};
type SidebarProps = {
    collapsed: boolean;
    expanded: string[];
    image: boolean;
    leftWidth: string;
    rightExpanded: boolean;
    rightHeight: string;
    rightWidth: string;
};
type TitlebarProps = {
    backgroundColor: string;
    outOfView: boolean;
};
export declare const useAppStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<Omit<Omit<import("zustand").StoreApi<AppSlice>, "setState" | "persist"> & {
    setState(partial: AppSlice | Partial<AppSlice> | ((state: AppSlice) => AppSlice | Partial<AppSlice>), replace?: false | undefined): unknown;
    setState(state: AppSlice | ((state: AppSlice) => AppSlice), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AppSlice, {
            actions: {
                setAlbumArtistDetailFavoriteSongsSort: (sortBy: SongListSort, sortOrder: SortOrder) => void;
                setAlbumArtistDetailGroupingType: (groupingType: "all" | "primary") => void;
                setAlbumArtistDetailSort: (sortBy: AlbumListSort, sortOrder: SortOrder) => void;
                setAlbumArtistIdsMode: (mode: "and" | "or") => void;
                setAlbumArtistSelectMode: (mode: "multi" | "single") => void;
                setAppStore: (data: Partial<AppSlice>) => void;
                setArtistIdsMode: (mode: "and" | "or") => void;
                setArtistSelectMode: (mode: "multi" | "single") => void;
                setCommandPaletteSearchSectionExpanded: (sectionId: string, expanded: boolean) => void;
                setGenreIdsMode: (mode: "and" | "or") => void;
                setGenreSelectMode: (mode: "multi" | "single") => void;
                setGlobalExpanded: (value: GlobalExpandedState | null) => void;
                setPageSidebar: (key: string, value: boolean) => void;
                setPrivateMode: (enabled: boolean) => void;
                setShowTimeRemaining: (enabled: boolean) => void;
                setSideBar: (options: Partial<SidebarProps>) => void;
                setTitleBar: (options: Partial<TitlebarProps>) => void;
            };
            albumArtistDetailFavoriteSongsSort: {
                sortBy: SongListSort;
                sortOrder: SortOrder;
            };
            albumArtistDetailSort: {
                groupingType: "all" | "primary";
                sortBy: AlbumListSort;
                sortOrder: SortOrder;
            };
            albumArtistIdsMode: "and" | "or";
            albumArtistSelectMode: "multi" | "single";
            artistIdsMode: "and" | "or";
            artistSelectMode: "multi" | "single";
            commandPalette: CommandPaletteProps;
            commandPaletteSearchSectionsExpanded: Record<string, boolean>;
            genreIdsMode: "and" | "or";
            genreSelectMode: "multi" | "single";
            isReorderingQueue: boolean;
            pageSidebar: Record<string, boolean>;
            platform: Platform;
            privateMode: boolean;
            showTimeRemaining: boolean;
            sidebar: SidebarProps;
            titlebar: TitlebarProps;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AppSlice) => void) => () => void;
        onFinishHydration: (fn: (state: AppSlice) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AppSlice, {
            actions: {
                setAlbumArtistDetailFavoriteSongsSort: (sortBy: SongListSort, sortOrder: SortOrder) => void;
                setAlbumArtistDetailGroupingType: (groupingType: "all" | "primary") => void;
                setAlbumArtistDetailSort: (sortBy: AlbumListSort, sortOrder: SortOrder) => void;
                setAlbumArtistIdsMode: (mode: "and" | "or") => void;
                setAlbumArtistSelectMode: (mode: "multi" | "single") => void;
                setAppStore: (data: Partial<AppSlice>) => void;
                setArtistIdsMode: (mode: "and" | "or") => void;
                setArtistSelectMode: (mode: "multi" | "single") => void;
                setCommandPaletteSearchSectionExpanded: (sectionId: string, expanded: boolean) => void;
                setGenreIdsMode: (mode: "and" | "or") => void;
                setGenreSelectMode: (mode: "multi" | "single") => void;
                setGlobalExpanded: (value: GlobalExpandedState | null) => void;
                setPageSidebar: (key: string, value: boolean) => void;
                setPrivateMode: (enabled: boolean) => void;
                setShowTimeRemaining: (enabled: boolean) => void;
                setSideBar: (options: Partial<SidebarProps>) => void;
                setTitleBar: (options: Partial<TitlebarProps>) => void;
            };
            albumArtistDetailFavoriteSongsSort: {
                sortBy: SongListSort;
                sortOrder: SortOrder;
            };
            albumArtistDetailSort: {
                groupingType: "all" | "primary";
                sortBy: AlbumListSort;
                sortOrder: SortOrder;
            };
            albumArtistIdsMode: "and" | "or";
            albumArtistSelectMode: "multi" | "single";
            artistIdsMode: "and" | "or";
            artistSelectMode: "multi" | "single";
            commandPalette: CommandPaletteProps;
            commandPaletteSearchSectionsExpanded: Record<string, boolean>;
            genreIdsMode: "and" | "or";
            genreSelectMode: "multi" | "single";
            isReorderingQueue: boolean;
            pageSidebar: Record<string, boolean>;
            platform: Platform;
            privateMode: boolean;
            showTimeRemaining: boolean;
            sidebar: SidebarProps;
            titlebar: TitlebarProps;
        }, unknown>>;
    };
}, "setState" | "devtools"> & {
    setState(partial: AppSlice | Partial<AppSlice> | ((state: AppSlice) => AppSlice | Partial<AppSlice>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(state: AppSlice | ((state: AppSlice) => AppSlice), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    devtools: {
        cleanup: () => void;
    };
}, "setState"> & {
    setState(nextStateOrUpdater: AppSlice | Partial<AppSlice> | ((state: import("immer").WritableDraft<AppSlice>) => void), shouldReplace?: false, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(nextStateOrUpdater: AppSlice | ((state: import("immer").WritableDraft<AppSlice>) => void), shouldReplace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
}>;
export declare const useAppStoreActions: () => {
    setAlbumArtistDetailFavoriteSongsSort: (sortBy: SongListSort, sortOrder: SortOrder) => void;
    setAlbumArtistDetailGroupingType: (groupingType: "all" | "primary") => void;
    setAlbumArtistDetailSort: (sortBy: AlbumListSort, sortOrder: SortOrder) => void;
    setAlbumArtistIdsMode: (mode: "and" | "or") => void;
    setAlbumArtistSelectMode: (mode: "multi" | "single") => void;
    setAppStore: (data: Partial<AppSlice>) => void;
    setArtistIdsMode: (mode: "and" | "or") => void;
    setArtistSelectMode: (mode: "multi" | "single") => void;
    setCommandPaletteSearchSectionExpanded: (sectionId: string, expanded: boolean) => void;
    setGenreIdsMode: (mode: "and" | "or") => void;
    setGenreSelectMode: (mode: "multi" | "single") => void;
    setGlobalExpanded: (value: GlobalExpandedState | null) => void;
    setPageSidebar: (key: string, value: boolean) => void;
    setPrivateMode: (enabled: boolean) => void;
    setShowTimeRemaining: (enabled: boolean) => void;
    setSideBar: (options: Partial<SidebarProps>) => void;
    setTitleBar: (options: Partial<TitlebarProps>) => void;
};
export declare const useSidebarStore: () => SidebarProps;
export declare const useSidebarRightExpanded: () => boolean;
export declare const useSetTitlebar: () => (options: Partial<TitlebarProps>) => void;
export declare const useTitlebarStore: () => TitlebarProps;
export declare const useCommandPalette: () => CommandPaletteProps;
export declare const useCommandPaletteState: () => {
    close: () => void;
    open: () => void;
    opened: boolean;
    toggle: () => void;
};
export declare const usePageSidebar: (key: string) => [boolean, (value: boolean) => void];
export declare const useGlobalExpanded: () => GlobalExpandedState | null;
export declare const useSetGlobalExpanded: () => (value: GlobalExpandedState | null) => void;
export declare const useGlobalExpandedState: () => {
    clearGlobalExpanded: () => void;
    globalExpanded: GlobalExpandedState | null;
    setGlobalExpanded: (value: GlobalExpandedState | null) => void;
};
export {};

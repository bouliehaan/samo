import merge from 'lodash/merge';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { AlbumListSort, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { Platform } from '/@/shared/types/types';
export const useAppStore = createWithEqualityFn()(persist(devtools(immer((set, get) => ({
    actions: {
        setAlbumArtistDetailFavoriteSongsSort: (sortBy, sortOrder) => {
            set((state) => {
                state.albumArtistDetailFavoriteSongsSort = {
                    sortBy,
                    sortOrder,
                };
            });
        },
        setAlbumArtistDetailGroupingType: (groupingType) => {
            set((state) => {
                state.albumArtistDetailSort.groupingType = groupingType;
            });
        },
        setAlbumArtistDetailSort: (sortBy, sortOrder) => {
            set((state) => {
                state.albumArtistDetailSort = {
                    ...state.albumArtistDetailSort,
                    sortBy,
                    sortOrder,
                };
            });
        },
        setAlbumArtistIdsMode: (mode) => {
            set((state) => {
                state.albumArtistIdsMode = mode;
            });
        },
        setAlbumArtistSelectMode: (mode) => {
            set((state) => {
                state.albumArtistSelectMode = mode;
            });
        },
        setAppStore: (data) => {
            set({ ...get(), ...data });
        },
        setArtistIdsMode: (mode) => {
            set((state) => {
                state.artistIdsMode = mode;
            });
        },
        setArtistSelectMode: (mode) => {
            set((state) => {
                state.artistSelectMode = mode;
            });
        },
        setCommandPaletteSearchSectionExpanded: (sectionId, expanded) => {
            set((state) => {
                state.commandPaletteSearchSectionsExpanded[sectionId] = expanded;
            });
        },
        setGenreIdsMode: (mode) => {
            set((state) => {
                state.genreIdsMode = mode;
            });
        },
        setGenreSelectMode: (mode) => {
            set((state) => {
                state.genreSelectMode = mode;
            });
        },
        setGlobalExpanded: (value) => {
            set((state) => {
                state.globalExpanded = value;
            });
        },
        setPageSidebar: (key, value) => {
            set((state) => {
                state.pageSidebar[key] = value;
            });
        },
        setPrivateMode: (privateMode) => {
            set((state) => {
                state.privateMode = privateMode;
            });
        },
        setShowTimeRemaining: (showTimeRemaining) => {
            set((state) => {
                state.showTimeRemaining = showTimeRemaining;
            });
        },
        setSideBar: (options) => {
            set((state) => {
                state.sidebar = { ...state.sidebar, ...options };
            });
        },
        setTitleBar: (options) => {
            set((state) => {
                state.titlebar = { ...state.titlebar, ...options };
            });
        },
    },
    albumArtistDetailFavoriteSongsSort: {
        sortBy: SongListSort.ID,
        sortOrder: SortOrder.ASC,
    },
    albumArtistDetailSort: {
        groupingType: 'primary',
        sortBy: AlbumListSort.RELEASE_DATE,
        sortOrder: SortOrder.DESC,
    },
    albumArtistIdsMode: 'and',
    albumArtistSelectMode: 'multi',
    artistIdsMode: 'and',
    artistSelectMode: 'multi',
    commandPalette: {
        close: () => {
            set((state) => {
                state.commandPalette.opened = false;
            });
        },
        open: () => {
            set((state) => {
                state.commandPalette.opened = true;
            });
        },
        opened: false,
        toggle: () => {
            set((state) => {
                state.commandPalette.opened = !state.commandPalette.opened;
            });
        },
    },
    commandPaletteSearchSectionsExpanded: {},
    genreIdsMode: 'and',
    genreSelectMode: 'multi',
    globalExpanded: null,
    isReorderingQueue: false,
    pageSidebar: {
        album: true,
        song: true,
    },
    platform: Platform.WINDOWS,
    privateMode: false,
    showTimeRemaining: false,
    sidebar: {
        collapsed: false,
        expanded: [],
        image: false,
        leftWidth: '350px',
        rightExpanded: false,
        rightHeight: '320px',
        rightWidth: '300px',
    },
    titlebar: {
        backgroundColor: '#000000',
        outOfView: false,
    },
})), { name: 'store_app' }), {
    merge: (persistedState, currentState) => {
        return merge(currentState, persistedState);
    },
    migrate: (persistedState, version) => {
        if (version <= 2) {
            return {};
        }
        const state = persistedState;
        if (version <= 4 && !state.sidebar.rightHeight) {
            state.sidebar.rightHeight = '320px';
        }
        if (version <= 6 &&
            (state.sidebar.rightWidth === '600px' || state.sidebar.rightWidth === '420px')) {
            state.sidebar.rightWidth = '300px';
        }
        return state;
    },
    name: 'store_app',
    partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ignore non-persisted state
        const { globalExpanded: _, ...rest } = state;
        return rest;
    },
    version: 7,
}));
export const useAppStoreActions = () => useAppStore((state) => state.actions);
export const useSidebarStore = () => useAppStore((state) => state.sidebar);
export const useSidebarRightExpanded = () => useAppStore((state) => state.sidebar.rightExpanded);
export const useSetTitlebar = () => useAppStore((state) => state.actions.setTitleBar);
export const useTitlebarStore = () => useAppStore((state) => state.titlebar);
export const useCommandPalette = () => useAppStore((state) => state.commandPalette);
export const useCommandPaletteState = () => useAppStore((state) => ({
    close: state.commandPalette.close,
    open: state.commandPalette.open,
    opened: state.commandPalette.opened,
    toggle: state.commandPalette.toggle,
}), shallow);
export const usePageSidebar = (key) => {
    const isOpen = useAppStore((state) => state.pageSidebar[key] ?? false);
    const setPageSidebar = useAppStore((state) => state.actions.setPageSidebar);
    const setIsOpen = (value) => {
        setPageSidebar(key, value);
    };
    return [isOpen, setIsOpen];
};
export const useGlobalExpanded = () => useAppStore((state) => state.globalExpanded);
export const useSetGlobalExpanded = () => useAppStore((state) => state.actions.setGlobalExpanded);
export const useGlobalExpandedState = () => {
    const globalExpanded = useGlobalExpanded();
    const setGlobalExpanded = useSetGlobalExpanded();
    const clearGlobalExpanded = () => setGlobalExpanded(null);
    return { clearGlobalExpanded, globalExpanded, setGlobalExpanded };
};

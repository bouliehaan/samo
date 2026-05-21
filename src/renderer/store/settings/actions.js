import { deepMergeIntoState } from './utils';
export const createSettingsActions = (set) => ({
    addCollection: (collection) => {
        set((state) => {
            state.general.collections.push(collection);
        });
    },
    removeCollection: (id) => {
        set((state) => {
            state.general.collections = state.general.collections.filter((c) => c.id !== id);
        });
    },
    reset: () => {
        localStorage.removeItem('store_settings');
        window.location.reload();
    },
    resetSampleRate: () => {
        set((state) => {
            state.playback.mpvProperties.audioSampleRateHz = 0;
        });
    },
    setArtistItems: (items) => {
        set((state) => {
            state.general.artistItems = items;
        });
    },
    setArtistReleaseTypeItems: (items) => {
        set((state) => {
            state.general.artistReleaseTypeItems = items;
        });
    },
    setGenreBehavior: (target) => {
        set((state) => {
            state.general.genreTarget = target;
        });
    },
    setHomeItems: (items) => {
        set((state) => {
            state.general.homeItems = items;
        });
    },
    setList: (type, data) => {
        set((state) => {
            const listState = state.lists[type];
            if (listState && data.table) {
                Object.assign(listState.table, data.table);
                delete data.table;
            }
            if (listState && data.detail) {
                if (!listState.detail) {
                    const t = listState.table;
                    listState.detail = {
                        columns: t.columns,
                        enableAlternateRowColors: false,
                        enableHeader: t.enableHeader,
                        enableHorizontalBorders: t.enableHorizontalBorders,
                        enableRowHoverHighlight: t.enableRowHoverHighlight,
                        enableVerticalBorders: t.enableVerticalBorders,
                        size: t.size,
                    };
                }
                Object.assign(listState.detail, data.detail);
                delete data.detail;
            }
            if (listState && data.grid) {
                Object.assign(listState.grid, data.grid);
                delete data.grid;
            }
            if (listState) {
                Object.assign(listState, data);
            }
        });
    },
    setPlaybackFilters: (filters) => {
        set((state) => {
            state.playback.filters = filters;
        });
    },
    setPlayerItems: (items) => {
        set((state) => {
            state.general.playerItems = items;
        });
    },
    setPlaylistBehavior: (target) => {
        set((state) => {
            state.general.playlistTarget = target;
        });
    },
    setSettings: (data) => {
        set((state) => {
            deepMergeIntoState(state, data);
        });
    },
    setSidebarItems: (items) => {
        set((state) => {
            state.general.sidebarItems = items;
        });
    },
    setTable: (type, data) => {
        set((state) => {
            const listState = state.lists[type];
            if (listState) {
                listState.table = data;
            }
        });
    },
    setTranscodingConfig: (config) => {
        set((state) => {
            state.playback.transcode = config;
        });
    },
    toggleMediaSession: () => {
        set((state) => {
            state.playback.mediaSession = !state.playback.mediaSession;
        });
    },
    toggleSidebarCollapseShare: () => {
        set((state) => {
            state.general.sidebarCollapseShared = !state.general.sidebarCollapseShared;
        });
    },
    updateCollection: (id, updates) => {
        set((state) => {
            const idx = state.general.collections.findIndex((c) => c.id === id);
            if (idx !== -1) {
                Object.assign(state.general.collections[idx], updates);
            }
        });
    },
});

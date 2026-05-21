import type { SavedCollection } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

import type {
    ArtistReleaseTypeItem,
    DataTableProps,
    GenreTarget,
    HomeItem,
    ItemListSettings,
    PlayerFilter,
    PlayerItem,
    PlaylistTarget,
    SettingsSlice,
    SettingsState,
    SidebarItemType,
    SortableItem,
    TranscodingConfig,
} from './schemas';
import { deepMergeIntoState, type DeepPartial } from './utils';

type SettingsSetter = (
    fn: (state: SettingsSlice) => void,
    replace?: false,
    action?: string,
) => void;

export const createSettingsActions = (set: SettingsSetter): SettingsSlice['actions'] => ({
    addCollection: (collection: SavedCollection) => {
        set((state) => {
            state.general.collections.push(collection);
        });
    },
    removeCollection: (id: string) => {
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
    setArtistReleaseTypeItems: (items: SortableItem<ArtistReleaseTypeItem>[]) => {
        set((state) => {
            state.general.artistReleaseTypeItems = items;
        });
    },
    setGenreBehavior: (target: GenreTarget) => {
        set((state) => {
            state.general.genreTarget = target;
        });
    },
    setHomeItems: (items: SortableItem<HomeItem>[]) => {
        set((state) => {
            state.general.homeItems = items;
        });
    },
    setList: (type: ItemListKey, data: DeepPartial<ItemListSettings>) => {
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
    setPlaybackFilters: (filters: PlayerFilter[]) => {
        set((state) => {
            state.playback.filters = filters;
        });
    },
    setPlayerItems: (items: SortableItem<PlayerItem>[]) => {
        set((state) => {
            state.general.playerItems = items;
        });
    },
    setPlaylistBehavior: (target: PlaylistTarget) => {
        set((state) => {
            state.general.playlistTarget = target;
        });
    },
    setSettings: (data: DeepPartial<SettingsState>) => {
        set((state) => {
            deepMergeIntoState(state, data);
        });
    },
    setSidebarItems: (items: SidebarItemType[]) => {
        set((state) => {
            state.general.sidebarItems = items;
        });
    },
    setTable: (type: ItemListKey, data: DataTableProps) => {
        set((state) => {
            const listState = state.lists[type];
            if (listState) {
                listState.table = data;
            }
        });
    },
    setTranscodingConfig: (config: TranscodingConfig) => {
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
    updateCollection: (id: string, updates: Partial<Omit<SavedCollection, 'id'>>) => {
        set((state) => {
            const idx = state.general.collections.findIndex((c) => c.id === id);
            if (idx !== -1) {
                Object.assign(state.general.collections[idx], updates);
            }
        });
    },
});

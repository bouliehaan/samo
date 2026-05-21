import merge from 'lodash/merge';
import { nanoid } from 'nanoid/non-secure';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createWithEqualityFn } from 'zustand/traditional';
import { identityPersistMigrate, PERSIST_VERSION_INITIAL, } from '/@/renderer/store/persist-migrate';
const initialState = {
    stations: {},
};
export const useRadioStore = createWithEqualityFn()(persist(devtools(immer((set, get) => ({
    ...initialState,
    actions: {
        createStation: (serverId, station) => {
            const id = nanoid();
            const newStation = {
                ...station,
                id,
            };
            set((state) => {
                if (!state.stations[serverId]) {
                    state.stations[serverId] = {};
                }
                state.stations[serverId][id] = newStation;
            });
            return newStation;
        },
        deleteStation: (serverId, stationId) => {
            set((state) => {
                if (state.stations[serverId]) {
                    delete state.stations[serverId][stationId];
                    // Clean up empty server entries
                    if (Object.keys(state.stations[serverId]).length === 0) {
                        delete state.stations[serverId];
                    }
                }
            });
        },
        getStation: (serverId, stationId) => {
            const state = get();
            return state.stations[serverId]?.[stationId] || null;
        },
        getStations: (serverId) => {
            const state = get();
            const serverStations = state.stations[serverId];
            if (!serverStations) {
                return [];
            }
            return Object.values(serverStations);
        },
        updateStation: (serverId, stationId, updates) => {
            set((state) => {
                if (state.stations[serverId]?.[stationId]) {
                    state.stations[serverId][stationId] = {
                        ...state.stations[serverId][stationId],
                        ...updates,
                    };
                }
            });
        },
    },
})), { name: 'store_radio' }), {
    merge: (persistedState, currentState) => merge(currentState, persistedState),
    migrate: (identityPersistMigrate),
    name: 'store_radio',
    version: PERSIST_VERSION_INITIAL,
}));
export const useRadioStoreActions = () => useRadioStore((state) => state.actions);
export const useRadioStations = (serverId) => {
    return useRadioStore((state) => {
        const serverStations = state.stations[serverId];
        if (!serverStations) {
            return [];
        }
        return Object.values(serverStations);
    });
};
export const useRadioStation = (serverId, stationId) => {
    return useRadioStore((state) => state.stations[serverId]?.[stationId] || null);
};

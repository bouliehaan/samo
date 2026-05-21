import merge from 'lodash/merge';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
export const useFullScreenPlayerStore = createWithEqualityFn()(persist(devtools(immer((set, get) => ({
    actions: {
        setStore: (data) => {
            const nextData = { ...data };
            delete nextData.opacity;
            set({ ...get(), ...nextData, opacity: 0 });
        },
    },
    activeTab: 'queue',
    dynamicBackground: true,
    dynamicImageBlur: 1.5,
    dynamicIsImage: false,
    expanded: false,
    opacity: 0,
    useImageAspectRatio: false,
    visualizerExpanded: false,
})), { name: 'store_full_screen_player' }), {
    merge: (persistedState, currentState) => {
        const merged = merge(currentState, persistedState);
        return { ...merged, opacity: 0 };
    },
    migrate: (persistedState, version) => {
        if (version <= 2) {
            return {};
        }
        return persistedState;
    },
    name: 'store_full_screen_player',
    version: 3,
}));
export const useFullScreenPlayerStoreActions = () => useFullScreenPlayerStore((state) => state.actions);
export const useSetFullScreenPlayerStore = () => useFullScreenPlayerStore((state) => state.actions.setStore);
export const useFullScreenPlayerOverlayState = () => useFullScreenPlayerStore((state) => ({
    expanded: state.expanded,
    visualizerExpanded: state.visualizerExpanded,
}), shallow);

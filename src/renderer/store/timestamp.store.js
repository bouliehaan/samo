import { subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
export const useTimestampStoreBase = createWithEqualityFn()(subscribeWithSelector((set) => ({
    setTimestamp: (timestamp) => {
        set({ timestamp });
    },
    timestamp: 0,
})));
export const subscribePlayerProgress = (onChange) => {
    return useTimestampStoreBase.subscribe((state) => state.timestamp, (timestamp, prevTimestamp) => {
        onChange({ timestamp }, { timestamp: prevTimestamp });
    }, {
        equalityFn: (a, b) => {
            return a === b;
        },
    });
};
export const usePlayerProgress = () => {
    return useTimestampStoreBase((state) => state.timestamp);
};
export const usePlayerTimestamp = () => {
    return useTimestampStoreBase((state) => state.timestamp);
};
export const setTimestamp = (timestamp) => {
    useTimestampStoreBase.getState().setTimestamp(timestamp);
};

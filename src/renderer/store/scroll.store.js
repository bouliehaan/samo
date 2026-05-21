import { create } from 'zustand';
export const useScrollStore = create((set, get) => ({
    getOffset: (key) => get().offsets[key],
    offsets: {},
    setOffset: (key, offset) => set((s) => ({
        offsets: { ...s.offsets, [key]: offset },
    })),
}));

import { useShallow } from 'zustand/react/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
export const useSleepTimerStore = createWithEqualityFn()((set) => ({
    active: false,
    cancelTimer: () => {
        set({
            active: false,
            mode: 'timed',
            remaining: 0,
        });
    },
    mode: 'timed',
    remaining: 0,
    setRemaining: (remaining) => {
        set({ remaining });
    },
    startEndOfSongTimer: () => {
        set({
            active: true,
            mode: 'endOfSong',
            remaining: 0,
        });
    },
    startTimedTimer: (durationSeconds) => {
        set({
            active: true,
            mode: 'timed',
            remaining: durationSeconds,
        });
    },
}));
// Selectors
export const useSleepTimerActive = () => useSleepTimerStore((s) => s.active);
export const useSleepTimerMode = () => useSleepTimerStore((s) => s.mode);
export const useSleepTimerRemaining = () => useSleepTimerStore((s) => s.remaining);
export const useSleepTimerActions = () => useSleepTimerStore(useShallow((s) => ({
    cancelTimer: s.cancelTimer,
    setRemaining: s.setRemaining,
    startEndOfSongTimer: s.startEndOfSongTimer,
    startTimedTimer: s.startTimedTimer,
})));

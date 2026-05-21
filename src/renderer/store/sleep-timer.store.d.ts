export type SleepTimerMode = 'endOfSong' | 'timed';
interface SleepTimerActions {
    cancelTimer: () => void;
    setRemaining: (remaining: number) => void;
    startEndOfSongTimer: () => void;
    startTimedTimer: (durationSeconds: number) => void;
}
interface SleepTimerState {
    /** Whether the timer is currently active */
    active: boolean;
    /** The mode of the timer */
    mode: SleepTimerMode;
    /** Remaining seconds (only ticks while playing) */
    remaining: number;
}
export declare const useSleepTimerStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<import("zustand").StoreApi<SleepTimerActions & SleepTimerState>>;
export declare const useSleepTimerActive: () => boolean;
export declare const useSleepTimerMode: () => SleepTimerMode;
export declare const useSleepTimerRemaining: () => number;
export declare const useSleepTimerActions: () => {
    cancelTimer: () => void;
    setRemaining: (remaining: number) => void;
    startEndOfSongTimer: () => void;
    startTimedTimer: (durationSeconds: number) => void;
};
export {};

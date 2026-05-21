export declare const setClockAnchor: (params: {
    isPlaying: boolean;
    speed?: number;
    timeSec: number;
}) => void;
export declare const setClockPlaying: (isPlaying: boolean) => void;
export declare const setClockSpeed: (speed: number) => void;
export declare const resetClock: () => void;
export declare const getClockNowMs: () => number;

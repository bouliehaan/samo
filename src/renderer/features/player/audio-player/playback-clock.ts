// The single source of truth for "what time is it in the song, right now, to the millisecond?"
//
// Engines write anchors (baseTimeMs + the perf-now at which it was captured + isPlaying + speed).
// Readers call getClockNowMs() and get an interpolated value. While playing, the clock advances
// against performance.now() so callers can poll at any cadence — including rAF — without burning
// React subscriptions or zustand re-renders, and without a per-frame IPC round trip on mpv.

type ClockState = {
    anchoredAtPerf: number;
    baseTimeMs: number;
    isPlaying: boolean;
    speed: number;
};

let state: ClockState = {
    anchoredAtPerf: performance.now(),
    baseTimeMs: 0,
    isPlaying: false,
    speed: 1,
};

const computeNow = (): number => {
    if (!state.isPlaying) return state.baseTimeMs;
    const elapsed = performance.now() - state.anchoredAtPerf;
    return state.baseTimeMs + elapsed * state.speed;
};

export const setClockAnchor = (params: { isPlaying: boolean; speed?: number; timeSec: number }) => {
    state = {
        anchoredAtPerf: performance.now(),
        baseTimeMs: Math.max(0, params.timeSec * 1000),
        isPlaying: params.isPlaying,
        speed: params.speed ?? state.speed,
    };
};

export const setClockPlaying = (isPlaying: boolean) => {
    if (state.isPlaying === isPlaying) return;
    state = {
        anchoredAtPerf: performance.now(),
        baseTimeMs: computeNow(),
        isPlaying,
        speed: state.speed,
    };
};

export const setClockSpeed = (speed: number) => {
    if (state.speed === speed) return;
    state = {
        anchoredAtPerf: performance.now(),
        baseTimeMs: computeNow(),
        isPlaying: state.isPlaying,
        speed,
    };
};

export const resetClock = () => {
    state = {
        anchoredAtPerf: performance.now(),
        baseTimeMs: 0,
        isPlaying: false,
        speed: state.speed,
    };
};

export const getClockNowMs = (): number => computeNow();

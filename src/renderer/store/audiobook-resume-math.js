const RESUME_NEAR_END_MINIMUM_S = 30;
const RESUME_NEAR_END_MAXIMUM_S = 120;
export const clampPosition = (seconds, duration) => {
    if (!Number.isFinite(seconds))
        return 0;
    const floor = Math.max(0, seconds);
    return duration > 0 ? Math.min(floor, duration) : floor;
};
export const normalizeResumePosition = (seconds, duration) => {
    const clamped = clampPosition(seconds, duration);
    if (duration <= 0 || clamped <= 0)
        return clamped;
    const nearEndThreshold = Math.min(RESUME_NEAR_END_MAXIMUM_S, Math.max(RESUME_NEAR_END_MINIMUM_S, duration * 0.02));
    return duration - clamped <= nearEndThreshold ? 0 : clamped;
};

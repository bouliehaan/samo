const RESUME_NEAR_END_MINIMUM_S = 30;
const RESUME_NEAR_END_MAXIMUM_S = 120;

export const clampPosition = (seconds: number, duration: number) => {
    if (!Number.isFinite(seconds)) return 0;
    const floor = Math.max(0, seconds);
    return duration > 0 ? Math.min(floor, duration) : floor;
};

export const normalizeResumePosition = (seconds: number, duration: number) => {
    const clamped = clampPosition(seconds, duration);
    if (duration <= 0 || clamped <= 0) return clamped;

    const nearEndThreshold = Math.min(
        RESUME_NEAR_END_MAXIMUM_S,
        Math.max(RESUME_NEAR_END_MINIMUM_S, duration * 0.02),
    );

    return duration - clamped <= nearEndThreshold ? 0 : clamped;
};

/**
 * Where the detail page's Play button should drop the listener.
 *
 * Two sources disagree and the order matters. While this book is the one
 * playing, the live playhead is the only current truth. Otherwise the
 * server-side progress on the item wins — that is the value that is right after
 * listening on a phone, whereas this machine's last-known position is stale the
 * moment another device touches the book.
 *
 * A finished book restarts rather than resuming one second from the end.
 */
export const resolveDetailResumePosition = (args: {
    duration: number;
    isActiveBook: boolean;
    livePosition: number;
    serverIsFinished?: boolean;
    serverPosition?: number;
}) => {
    const { duration, isActiveBook, livePosition, serverIsFinished, serverPosition } = args;

    if (isActiveBook) {
        return normalizeResumePosition(livePosition, duration);
    }

    if (serverIsFinished) {
        return 0;
    }

    return normalizeResumePosition(serverPosition ?? 0, duration);
};

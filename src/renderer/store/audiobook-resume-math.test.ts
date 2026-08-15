import { describe, expect, it } from 'vitest';

import {
    clampPosition,
    normalizeResumePosition,
    resolveDetailResumePosition,
} from './audiobook-resume-math';

describe('clampPosition', () => {
    it('returns 0 for non-finite input', () => {
        expect(clampPosition(Number.NaN, 100)).toBe(0);
    });

    it('clamps to duration when duration is known', () => {
        expect(clampPosition(150, 100)).toBe(100);
        expect(clampPosition(-5, 100)).toBe(0);
    });

    it('floors at zero when duration is unknown', () => {
        expect(clampPosition(42, 0)).toBe(42);
    });
});

describe('normalizeResumePosition', () => {
    it('returns zero for positions in the near-end window', () => {
        expect(normalizeResumePosition(995, 1000)).toBe(0);
    });

    it('preserves positions that are not near the end', () => {
        expect(normalizeResumePosition(120, 3600)).toBe(120);
    });

    it('uses a 2% near-end threshold with a 30–120 second cap', () => {
        expect(normalizeResumePosition(2945, 3000)).toBe(0);
        expect(normalizeResumePosition(2885, 3000)).toBe(2885);
    });
});

describe('resolveDetailResumePosition', () => {
    const DURATION = 3600;

    it('uses the live playhead while this book is the one playing', () => {
        expect(
            resolveDetailResumePosition({
                duration: DURATION,
                isActiveBook: true,
                livePosition: 1200,
                serverPosition: 5,
            }),
        ).toBe(1200);
    });

    it('prefers server progress over the live playhead for a book that is not playing', () => {
        // The live playhead belongs to a DIFFERENT book, so it must not leak in.
        expect(
            resolveDetailResumePosition({
                duration: DURATION,
                isActiveBook: false,
                livePosition: 1200,
                serverPosition: 90,
            }),
        ).toBe(90);
    });

    it('restarts a finished book instead of resuming at the end', () => {
        expect(
            resolveDetailResumePosition({
                duration: DURATION,
                isActiveBook: false,
                livePosition: 0,
                serverIsFinished: true,
                serverPosition: 3599,
            }),
        ).toBe(0);
    });

    it('treats an unstarted book as position zero', () => {
        expect(
            resolveDetailResumePosition({
                duration: DURATION,
                isActiveBook: false,
                livePosition: 0,
            }),
        ).toBe(0);
    });

    it('restarts rather than resuming inside the near-end window', () => {
        // 3595s of 3600s is within the near-end threshold, so Play restarts.
        expect(
            resolveDetailResumePosition({
                duration: DURATION,
                isActiveBook: false,
                livePosition: 0,
                serverPosition: 3595,
            }),
        ).toBe(0);
    });

    it('clamps a server position that overruns the duration', () => {
        expect(
            resolveDetailResumePosition({
                duration: DURATION,
                isActiveBook: true,
                livePosition: 99_999,
            }),
        ).toBe(0);
    });
});

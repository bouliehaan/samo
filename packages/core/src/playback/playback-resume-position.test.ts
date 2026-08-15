import { describe, expect, it } from 'vitest';

import {
    longFormNearEndWindowSeconds,
    resolveLongFormResumeSeconds,
} from './playback-resume-position';

describe('resolveLongFormResumeSeconds', () => {
    const HOUR = 3600;

    it('resumes an item stopped in the middle', () => {
        expect(resolveLongFormResumeSeconds({ durationSeconds: HOUR, progressSeconds: 1200 })).toBe(
            1200,
        );
    });

    it('starts an unplayed item from the top', () => {
        expect(resolveLongFormResumeSeconds({ durationSeconds: HOUR })).toBe(0);
        expect(resolveLongFormResumeSeconds({ durationSeconds: HOUR, progressSeconds: 0 })).toBe(0);
    });

    it('starts a completed item over however far along its position was parked', () => {
        // The reported bug: the server keeps the end position AND the flag, so
        // a favourite episode replayed at its outro every single time.
        expect(
            resolveLongFormResumeSeconds({
                completed: true,
                durationSeconds: HOUR,
                progressSeconds: HOUR - 2,
            }),
        ).toBe(0);
    });

    it('treats near-the-end as finished when no flag was ever written', () => {
        expect(
            resolveLongFormResumeSeconds({
                durationSeconds: HOUR,
                progressSeconds: HOUR - 10,
            }),
        ).toBe(0);
    });

    it('treats a position at or past the duration as finished', () => {
        // A re-scan that shortened the duration, or a position written against
        // a different encode — a seek off the end is never the right answer.
        expect(resolveLongFormResumeSeconds({ durationSeconds: HOUR, progressSeconds: HOUR })).toBe(
            0,
        );
        expect(
            resolveLongFormResumeSeconds({
                durationSeconds: HOUR,
                progressSeconds: HOUR + 500,
            }),
        ).toBe(0);
    });

    it('honors the position when the duration is unknown, minus the near-end test', () => {
        expect(resolveLongFormResumeSeconds({ progressSeconds: 1200 })).toBe(1200);
        // The flag is all that is left to go on, and it still decides.
        expect(resolveLongFormResumeSeconds({ completed: true, progressSeconds: 1200 })).toBe(0);
    });

    it('rounds down to whole seconds', () => {
        expect(resolveLongFormResumeSeconds({ durationSeconds: HOUR, progressSeconds: 42.9 })).toBe(
            42,
        );
    });
});

describe('longFormNearEndWindowSeconds', () => {
    it('scales with length between a 30s floor and a 120s ceiling', () => {
        // A 5-minute episode: 2% is 6s, so the floor carries it — otherwise the
        // last few seconds of a short item would never read as finished.
        expect(longFormNearEndWindowSeconds(300)).toBe(30);
        // A 30-minute episode sits in the proportional band.
        expect(longFormNearEndWindowSeconds(1800)).toBe(36);
        // A 12-hour audiobook: 2% is over 14 minutes, which would throw away a
        // real listening position. The ceiling caps it.
        expect(longFormNearEndWindowSeconds(12 * 3600)).toBe(120);
    });
});

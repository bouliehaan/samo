import { describe, expect, it } from 'vitest';
import { clampPosition, normalizeResumePosition } from './audiobook-resume-math';
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

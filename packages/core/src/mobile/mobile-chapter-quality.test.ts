import { describe, expect, it } from 'vitest';

import { CHAPTER_REVIEW_CONFIDENCE, deriveChapterQuality } from './mobile-media-detail';

describe('deriveChapterQuality', () => {
    it('returns undefined when there are no chapters or no source', () => {
        expect(deriveChapterQuality('audio-aligned', 0.9, 0)).toBeUndefined();
        expect(deriveChapterQuality(undefined, 0.9, 12)).toBeUndefined();
    });

    it('treats real in-file markers as authoritative (no review)', () => {
        for (const source of ['embedded', 'cue']) {
            const q = deriveChapterQuality(source, 0, 30);
            expect(q?.needsReview).toBe(false);
            expect(q?.label).toBe('Embedded chapters');
        }
    });

    it('flags confident vs low-confidence audio-aligned chapters', () => {
        expect(deriveChapterQuality('audio-aligned', 0.88, 73)?.needsReview).toBe(false);
        expect(
            deriveChapterQuality('audio-aligned', CHAPTER_REVIEW_CONFIDENCE - 0.01, 73)
                ?.needsReview,
        ).toBe(true);
        // Missing confidence is not treated as low.
        expect(deriveChapterQuality('audio-aligned', undefined, 73)?.needsReview).toBe(false);
    });

    it('flags weak sources for review', () => {
        // One-chapter-per-file track splits — not real chapters.
        expect(deriveChapterQuality('file', 0, 115)).toMatchObject({
            label: 'File-based',
            needsReview: true,
        });
        // Verified Audible edition but pasted unaligned (the registration declined).
        expect(deriveChapterQuality('audnexus', 0, 62)).toMatchObject({
            label: 'From Audible',
            needsReview: true,
        });
    });

    it('passes through an unknown source without flagging it', () => {
        expect(deriveChapterQuality('something-new', 0.5, 10)).toMatchObject({
            label: 'something-new',
            needsReview: false,
        });
    });
});

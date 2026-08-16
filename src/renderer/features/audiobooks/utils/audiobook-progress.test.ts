import { describe, expect, it } from 'vitest';

import { audiobookProgressFraction } from '/@/renderer/features/audiobooks/utils/audiobook-progress';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';

const book = (mediaProgress?: LongFormLibraryItem['mediaProgress']): LongFormLibraryItem =>
    ({ id: 'book_1', mediaProgress }) as LongFormLibraryItem;

describe('audiobookProgressFraction', () => {
    it('uses this machine’s saved playhead when the listing has no position', () => {
        // The shape the audiobooks listing actually returns: a duration, and
        // no per-user currentTime at all.
        expect(audiobookProgressFraction(book({ duration: 1000, isFinished: false }), 400)).toBe(
            0.4,
        );
    });

    it('prefers the server position when the listing supplies one', () => {
        expect(
            audiobookProgressFraction(book({ currentTime: 800, duration: 1000 }), 100),
        ).toBeCloseTo(0.8);
    });

    it('shows nothing for a book that has never been opened', () => {
        expect(audiobookProgressFraction(book({ duration: 1000 }), undefined)).toBeUndefined();
    });

    it('excludes a finished book', () => {
        expect(
            audiobookProgressFraction(book({ duration: 1000, isFinished: true }), 400),
        ).toBeUndefined();
    });

    it('excludes a book barely touched', () => {
        expect(audiobookProgressFraction(book({ duration: 1000 }), 15)).toBeUndefined();
    });

    it('excludes a book within a minute of the end', () => {
        expect(audiobookProgressFraction(book({ duration: 1000 }), 950)).toBeUndefined();
    });

    it('survives a listing with no duration', () => {
        expect(audiobookProgressFraction(book(undefined), 400)).toBeUndefined();
    });
});

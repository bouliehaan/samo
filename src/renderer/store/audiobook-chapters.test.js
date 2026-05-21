import { describe, expect, it } from 'vitest';
import { getCurrentChapterIndex, getOrderedAudiobookChapters } from './audiobook-chapters';
const chapter = (start, title) => ({
    id: `${start}`,
    start,
    title,
});
describe('getCurrentChapterIndex', () => {
    const chapters = [chapter(0, 'Intro'), chapter(120, 'Middle'), chapter(600, 'End')];
    it('returns -1 when there are no chapters', () => {
        expect(getCurrentChapterIndex([], 30, 900)).toBe(-1);
    });
    it('returns the last chapter whose start is <= position', () => {
        expect(getCurrentChapterIndex(chapters, 300, 900)).toBe(1);
        expect(getCurrentChapterIndex(chapters, 0, 900)).toBe(0);
    });
    it('clamps position to duration before searching', () => {
        expect(getCurrentChapterIndex(chapters, 2000, 900)).toBe(2);
    });
});
describe('getOrderedAudiobookChapters', () => {
    it('returns an empty list when fewer than two valid chapters exist', () => {
        expect(getOrderedAudiobookChapters([chapter(0, 'Only')], 600)).toEqual([]);
    });
    it('builds contiguous chapter ranges sorted by start time', () => {
        const items = getOrderedAudiobookChapters([chapter(0, 'A'), chapter(120, 'B'), chapter(300, 'C')], 600);
        expect(items).toHaveLength(3);
        expect(items[0]).toMatchObject({ start: 0, end: 120, originalIndex: 0 });
        expect(items[1]).toMatchObject({ start: 120, end: 300, originalIndex: 1 });
        expect(items[2]).toMatchObject({ start: 300, end: 600, originalIndex: 2 });
    });
});

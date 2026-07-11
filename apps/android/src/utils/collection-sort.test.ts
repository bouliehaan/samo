import { type MobileHomeItem } from '@samo/core/mobile';
import { describe, expect, it } from 'vitest';

import { buildAlphabetLetterIndex, sortCollectionHomeItems } from './collection-sort';

const makeItem = (title: string, playCount?: number): MobileHomeItem =>
    ({ id: title, playCount, source: { id: 'srv' }, title, type: 'album' }) as MobileHomeItem;

// Mirror the two-up grid: the rail jumps to a ROW (index / 2), so resolve the
// pair of items a letter lands on.
const rowItemsForLetter = (
    items: MobileHomeItem[],
    index: Map<string, number>,
    letter: string,
): string[] => {
    const row = index.get(letter);
    if (row == null) return [];
    return [items[row * 2]?.title, items[row * 2 + 1]?.title].filter(Boolean) as string[];
};

describe('sortCollectionHomeItems', () => {
    it('orders alphabetically with numbers/symbols ahead of letters', () => {
        const sorted = sortCollectionHomeItems(
            [makeItem('Zoo'), makeItem('apple'), makeItem('Blue'), makeItem('1989')],
            'alphabetical',
        );
        expect(sorted.map((item) => item.title)).toEqual(['1989', 'apple', 'Blue', 'Zoo']);
    });

    it('orders by play count, highest first', () => {
        const sorted = sortCollectionHomeItems(
            [makeItem('Apple', 90), makeItem('Zoo', 100), makeItem('Banana', 10)],
            'playCount',
        );
        expect(sorted.map((item) => item.title)).toEqual(['Zoo', 'Apple', 'Banana']);
    });
});

describe('buildAlphabetLetterIndex (rail invariant)', () => {
    it('lands every letter on a row that actually contains that letter — but ONLY over an alphabetical list', () => {
        const items = [
            makeItem('Zoo', 100),
            makeItem('Apple', 90),
            makeItem('Zebra', 80),
            makeItem('Banana', 10),
        ];

        // Alphabetical: Apple, Banana, Zebra, Zoo — letters are contiguous.
        const alphabetical = sortCollectionHomeItems(items, 'alphabetical');
        const alphabeticalIndex = buildAlphabetLetterIndex(alphabetical);
        // Jumping to Z lands on the Zebra/Zoo row.
        expect(rowItemsForLetter(alphabetical, alphabeticalIndex, 'Z')).toEqual(['Zebra', 'Zoo']);
        // Every letter's row contains an item starting with that letter.
        for (const [letter, row] of alphabeticalIndex) {
            const rowTitles = [alphabetical[row * 2]?.title, alphabetical[row * 2 + 1]?.title];
            expect(rowTitles.some((title) => title?.charAt(0).toUpperCase() === letter)).toBe(true);
        }
    });

    it('regression: over a play-count list the rail lands on the wrong items', () => {
        // This is the reported bug: with play-count ordering the letters are
        // scattered, so the first item starting with a letter sits next to
        // unrelated ones. Tapping a letter jumps to one match surrounded by junk.
        const items = [
            makeItem('Zoo', 100),
            makeItem('Apple', 90),
            makeItem('Zebra', 80),
            makeItem('Banana', 10),
        ];
        const byPlayCount = sortCollectionHomeItems(items, 'playCount'); // Zoo, Apple, Zebra, Banana
        const playCountIndex = buildAlphabetLetterIndex(byPlayCount);

        // "A" resolves to row 0, whose left tile is "Zoo" — not an A at all.
        expect(playCountIndex.get('A')).toBe(0);
        expect(byPlayCount[0].title).toBe('Zoo');
        const aRow = rowItemsForLetter(byPlayCount, playCountIndex, 'A');
        expect(aRow[0]?.charAt(0).toUpperCase()).not.toBe('A');
    });

    it('buckets digit/symbol titles under "#"', () => {
        const sorted = sortCollectionHomeItems([makeItem('1989'), makeItem('Apple')], 'alphabetical');
        const index = buildAlphabetLetterIndex(sorted);
        expect(index.get('#')).toBe(0);
        expect(sorted[0].title).toBe('1989');
    });
});

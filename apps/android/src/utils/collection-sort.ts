import { type MobileHomeItem, sortMobileHomeItemsByPlayCount } from '@samo/core/mobile';

const TITLE_SORT_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

export type CollectionItemSortMode = 'alphabetical' | 'playCount' | 'recent';

export const sortCollectionHomeItems = (
    items: MobileHomeItem[],
    mode: CollectionItemSortMode,
): MobileHomeItem[] => {
    if (mode === 'playCount') {
        return sortMobileHomeItemsByPlayCount(items);
    }
    if (mode === 'recent') {
        return [...items].sort((left, right) => (right.addedAt ?? 0) - (left.addedAt ?? 0));
    }

    return [...items].sort((left, right) =>
        TITLE_SORT_COLLATOR.compare(left.title.trim(), right.title.trim()),
    );
};

// Letters that anchor the alphabet rail. '#' catches anything starting with a
// digit or non-Latin character so every item maps somewhere.
export const ALPHABET_SIDEBAR_LETTERS = [
    '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
    'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
    'X', 'Y', 'Z',
] as const;

/**
 * Map each alphabet-rail letter to the ROW index where it first appears, for a
 * two-up grid (two items per row, hence `index / 2`).
 *
 * The indices are only meaningful when `items` is sorted ALPHABETICALLY. Over
 * any other order (e.g. play count) a letter's items aren't contiguous, so each
 * letter resolves to the first item that happens to start with it — a jump then
 * lands on a single matching item surrounded by unrelated ones. Callers must
 * only surface the rail for an A–Z list.
 */
export const buildAlphabetLetterIndex = (
    items: MobileHomeItem[],
): Map<string, number> => {
    const map = new Map<string, number>();
    items.forEach((item, index) => {
        const first = item.title.charAt(0).toUpperCase();
        const letter = first >= 'A' && first <= 'Z' ? first : '#';
        if (!map.has(letter)) {
            map.set(letter, Math.floor(index / 2));
        }
    });
    return map;
};

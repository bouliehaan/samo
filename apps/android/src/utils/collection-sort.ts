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

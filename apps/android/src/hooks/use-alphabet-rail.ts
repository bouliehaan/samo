import { type MobileHomeItem } from '@samo/core/mobile';
import { type FlashListRef } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    buildAlphabetLetterIndex,
    type CollectionItemSortMode,
    sortCollectionHomeItems,
} from '../utils/collection-sort';
import { getRecentContentItemKey } from '../services/recent-content';
import { VIEW_ALL_ROW_HEIGHT } from '../theme/layout';

export interface AlphabetRailRow {
    key: string;
    left: MobileHomeItem;
    right: MobileHomeItem | undefined;
}

const chunkIntoRows = (items: MobileHomeItem[]): AlphabetRailRow[] => {
    const rows: AlphabetRailRow[] = [];
    for (let index = 0; index < items.length; index += 2) {
        const left = items[index];
        const right = items[index + 1];
        rows.push({
            // Row identity is its left item, so adding/removing items below this
            // row won't shift the key and React keeps the row mounted.
            key: `row:${getRecentContentItemKey(left)}`,
            left,
            right,
        });
    }
    return rows;
};

/**
 * Drives a two-up browse grid that carries an A–Z rail.
 *
 * The grid shows `baseSortMode` order (e.g. play count / recents) until the
 * user touches the rail. Because an A–Z jump is only meaningful over an A–Z
 * list, the first rail interaction flips the *display* to alphabetical and then
 * scrolls to the letter; it stays alphabetical for the rest of the visit. The
 * flip is ephemeral — it resets when the sort changes, the collection changes
 * (`resetKey`), or the screen leaves the foreground (`isForeground` → false) —
 * so returning to the page shows the base order again.
 */
export const useAlphabetRail = ({
    baseSortMode,
    isForeground = true,
    items,
    resetKey,
}: {
    baseSortMode: CollectionItemSortMode;
    isForeground?: boolean;
    items: MobileHomeItem[];
    resetKey?: number | string;
}) => {
    const listRef = useRef<FlashListRef<AlphabetRailRow>>(null);
    const [railAlphabetical, setRailAlphabetical] = useState(false);
    const railAlphabeticalRef = useRef(false);
    const pendingJumpLetterRef = useRef<string | null>(null);
    const jumpFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [jumpFeedbackLetter, setJumpFeedbackLetter] = useState<string | null>(null);

    const resetRail = useCallback(() => {
        railAlphabeticalRef.current = false;
        pendingJumpLetterRef.current = null;
        setRailAlphabetical(false);
    }, []);

    // A new sort or a different collection starts fresh in the base order.
    useEffect(() => {
        resetRail();
    }, [baseSortMode, resetKey, resetRail]);

    // Leaving the page (tab switch, detail overlay) drops the ephemeral flip so
    // coming back shows the base order. The grids stay mounted across these
    // transitions, so unmount can't be relied on for the reset.
    useEffect(() => {
        if (!isForeground) {
            resetRail();
        }
    }, [isForeground, resetRail]);

    const baseSortedItems = useMemo(
        () => sortCollectionHomeItems(items, baseSortMode),
        [baseSortMode, items],
    );
    const alphabeticalSortedItems = useMemo(
        () =>
            baseSortMode === 'alphabetical'
                ? baseSortedItems
                : sortCollectionHomeItems(items, 'alphabetical'),
        [baseSortMode, baseSortedItems, items],
    );
    const displayItems = railAlphabetical ? alphabeticalSortedItems : baseSortedItems;
    const rows = useMemo(() => chunkIntoRows(displayItems), [displayItems]);
    // The rail always jumps against the alphabetical arrangement, regardless of
    // what order is currently displayed.
    const letterIndex = useMemo(
        () => buildAlphabetLetterIndex(alphabeticalSortedItems),
        [alphabeticalSortedItems],
    );

    const letterIndexRef = useRef(letterIndex);
    letterIndexRef.current = letterIndex;
    const displayAlphabeticalRef = useRef(false);
    displayAlphabeticalRef.current = railAlphabetical || baseSortMode === 'alphabetical';

    useEffect(
        () => () => {
            if (jumpFeedbackTimeoutRef.current) {
                clearTimeout(jumpFeedbackTimeoutRef.current);
            }
        },
        [],
    );

    const showJumpFeedback = useCallback((letter: string) => {
        if (jumpFeedbackTimeoutRef.current) {
            clearTimeout(jumpFeedbackTimeoutRef.current);
        }
        setJumpFeedbackLetter(letter);
        jumpFeedbackTimeoutRef.current = setTimeout(() => {
            setJumpFeedbackLetter(null);
            jumpFeedbackTimeoutRef.current = null;
        }, 420);
    }, []);

    const scrollToRowIndex = useCallback((rowIndex: number) => {
        try {
            const scroll = listRef.current?.scrollToIndex({ animated: false, index: rowIndex });
            void scroll?.catch(() => {
                listRef.current?.scrollToOffset({
                    animated: false,
                    offset: rowIndex * VIEW_ALL_ROW_HEIGHT,
                });
            });
        } catch {
            listRef.current?.scrollToOffset({
                animated: false,
                offset: rowIndex * VIEW_ALL_ROW_HEIGHT,
            });
        }
    }, []);

    const flushPendingJump = useCallback(() => {
        const letter = pendingJumpLetterRef.current;
        if (letter == null) return;
        const rowIndex = letterIndexRef.current.get(letter);
        if (typeof rowIndex !== 'number') return;
        pendingJumpLetterRef.current = null;
        scrollToRowIndex(rowIndex);
    }, [scrollToRowIndex]);

    // Once a flip to alphabetical has re-sorted the list (rows changed), run the
    // jump that was queued at the moment the rail was touched.
    useEffect(() => {
        if (railAlphabetical) {
            flushPendingJump();
        }
    }, [flushPendingJump, railAlphabetical, rows]);

    const onJumpToLetter = useCallback(
        (letter: string) => {
            if (!letterIndexRef.current.has(letter)) return;
            showJumpFeedback(letter);
            pendingJumpLetterRef.current = letter;
            if (displayAlphabeticalRef.current) {
                // Already showing A–Z (subsequent drag letters, or an
                // already-alphabetical base sort): scroll right away.
                flushPendingJump();
            } else {
                // First touch over a non-alphabetical list: flip the display and
                // let the effect above fire the jump after the re-sort renders.
                railAlphabeticalRef.current = true;
                setRailAlphabetical(true);
            }
        },
        [flushPendingJump, showJumpFeedback],
    );

    return { jumpFeedbackLetter, letterIndex, listRef, onJumpToLetter, rows };
};

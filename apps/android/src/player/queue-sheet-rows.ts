import { type MobilePlayableAudio, type MobilePlaybackSegment } from '@samo/core/mobile';

import {
    QUEUE_SHEET_HEADER_ROW_HEIGHT,
    QUEUE_SHEET_ROW_HEIGHT,
} from '../theme/layout';

export type QueueSheetListItem =
    | { chapter: MobilePlaybackSegment; index: number; kind: 'chapter' }
    | { id: string; kind: 'header'; label: string }
    | { index: number; item: MobilePlayableAudio; kind: 'queue' };

export type QueueRowLayout = { offsets: number[]; totalHeight: number };

export type QueueDragMeta = {
    /** Number of up-next items (slots run 0..count). */
    count: number;
    /** Content-space Y of the first up-next row. */
    firstRowTop: number;
    /** Queue index of the first up-next item. */
    firstUpNext: number;
};

/**
 * Build the sheet's row list. Chapters replace the queue wholesale; otherwise
 * the flat queue is grouped into Previously played / Now playing / Up next so
 * the sheet reads like a timeline instead of one undifferentiated list, and so
 * the player can scroll straight to the current track.
 */
export const buildQueueSheetRows = (
    chapters: MobilePlaybackSegment[] | undefined,
    items: MobilePlayableAudio[],
    currentIndex: number,
): QueueSheetListItem[] => {
    if ((chapters?.length ?? 0) > 0) {
        return (chapters ?? []).map((chapter, index) => ({
            chapter,
            index,
            kind: 'chapter' as const,
        }));
    }

    const rows: QueueSheetListItem[] = [];
    items.forEach((item, index) => {
        if (index === 0 && currentIndex > 0) {
            rows.push({ id: 'header-history', kind: 'header', label: 'Previously played' });
        }
        if (index === currentIndex) {
            rows.push({ id: 'header-now', kind: 'header', label: 'Now playing' });
        }
        if (index === currentIndex + 1) {
            rows.push({ id: 'header-next', kind: 'header', label: 'Up next' });
        }
        rows.push({ index, item, kind: 'queue' as const });
    });
    return rows;
};

/**
 * Content-space geometry for the drag machinery. Row heights are FIXED, so
 * insertion slots are pure arithmetic — no measuring of virtualized rows.
 */
export const buildQueueRowLayout = (rows: QueueSheetListItem[]): QueueRowLayout => {
    const offsets: number[] = [];
    let y = 0;
    for (const row of rows) {
        offsets.push(y);
        y += row.kind === 'header' ? QUEUE_SHEET_HEADER_ROW_HEIGHT : QUEUE_SHEET_ROW_HEIGHT;
    }
    return { offsets, totalHeight: y };
};

/** Geometry of the reorderable (up-next) region; null when nothing can drag. */
export const buildQueueDragMeta = (
    showingChapters: boolean,
    hasQueue: boolean,
    currentIndex: number,
    itemCount: number,
    rows: QueueSheetListItem[],
    rowLayout: QueueRowLayout,
): null | QueueDragMeta => {
    if (showingChapters || !hasQueue || currentIndex < 0) {
        return null;
    }
    const firstUpNext = currentIndex + 1;
    const count = itemCount - firstUpNext;
    if (count < 1) {
        return null;
    }
    const firstRowPos = rows.findIndex(
        (row) => row.kind === 'queue' && row.index === firstUpNext,
    );
    if (firstRowPos < 0) {
        return null;
    }
    return { count, firstRowTop: rowLayout.offsets[firstRowPos]!, firstUpNext };
};

/** Row index the closed sheet parks on (the now-playing section). */
export const findNowPlayingRowIndex = (
    showingChapters: boolean,
    activeChapterIndex: number,
    currentIndex: number,
    rows: QueueSheetListItem[],
): number => {
    if (showingChapters) {
        return Math.max(0, activeChapterIndex);
    }
    return rows.findIndex(
        (row) =>
            (row.kind === 'header' && row.id === 'header-now') ||
            (row.kind === 'queue' && row.index === currentIndex),
    );
};

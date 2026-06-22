import { LongFormChapter } from '/@/shared/api/long-form-types';

export interface AudiobookChapterListItem {
    chapter: LongFormChapter;
    duration: number;
    end: number;
    originalIndex: number;
    start: number;
}

/**
 * Single source of truth for "which chapter is the listener currently in?".
 */
export function getCurrentChapterIndex(
    chapters: LongFormChapter[],
    position: number,
    duration: number,
): number {
    if (chapters.length === 0) return -1;
    const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
    const clamped = Math.min(Math.max(position, 0), max);
    for (let i = chapters.length - 1; i >= 0; i--) {
        if (chapters[i].start <= clamped) return i;
    }
    return 0;
}

export function getOrderedAudiobookChapters(
    chapters: LongFormChapter[],
    duration: number,
): AudiobookChapterListItem[] {
    if (chapters.length <= 1 || !Number.isFinite(duration) || duration <= 0) return [];

    const orderedChapters = chapters
        .map((chapter, originalIndex) => ({ chapter, originalIndex }))
        .filter(
            ({ chapter }) =>
                Number.isFinite(chapter.start) && chapter.start >= 0 && chapter.start < duration,
        )
        .sort((a, b) => a.chapter.start - b.chapter.start)
        .filter(
            ({ chapter }, index, ordered) =>
                index === 0 || chapter.start !== ordered[index - 1].chapter.start,
        );

    if (orderedChapters.length <= 1 || orderedChapters[0].chapter.start > 0.5) return [];

    return orderedChapters
        .map(({ chapter, originalIndex }, index) => {
            const start = chapter.start;
            const end = Math.min(
                index === orderedChapters.length - 1
                    ? duration
                    : orderedChapters[index + 1].chapter.start,
                duration,
            );

            if (end <= start) return null;

            return {
                chapter,
                duration: end - start,
                end,
                originalIndex,
                start,
            };
        })
        .filter((chapter): chapter is AudiobookChapterListItem => chapter !== null);
}

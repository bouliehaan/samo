import { AudiobookshelfChapter } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
export interface AudiobookChapterListItem {
    chapter: AudiobookshelfChapter;
    duration: number;
    end: number;
    originalIndex: number;
    start: number;
}
/**
 * Single source of truth for "which chapter is the listener currently in?".
 */
export declare function getCurrentChapterIndex(chapters: AudiobookshelfChapter[], position: number, duration: number): number;
export declare function getOrderedAudiobookChapters(chapters: AudiobookshelfChapter[], duration: number): AudiobookChapterListItem[];

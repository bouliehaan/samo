import { type AbsPlaybackBaseActions, type AbsPlaybackCoreState } from '/@/renderer/store/abs-playback.store';
import { AudiobookshelfChapter, AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
export type { AudiobookChapterListItem } from '/@/renderer/store/audiobook-chapters';
export { getCurrentChapterIndex, getOrderedAudiobookChapters, } from '/@/renderer/store/audiobook-chapters';
type AudiobookExtra = {
    chapters: AudiobookshelfChapter[];
};
type AudiobookResume = {
    resumeByItemId: Record<string, number>;
};
export interface AudiobookActions extends AbsPlaybackBaseActions {
    play: (server: ServerListItemWithCredential, item: AudiobookshelfLibraryItem) => Promise<void>;
    seekToNextChapter: () => void;
    seekToPreviousChapter: () => void;
    setDuration: (seconds: number) => void;
}
export type AudiobookState = AbsPlaybackCoreState & AudiobookExtra & AudiobookResume & {
    actions: AudiobookActions;
};
declare const useAudiobookStore: any;
export { useAudiobookStore };
export declare const useAudiobookContentUrl: () => null | string;
export declare const useAudiobookItem: () => AudiobookshelfLibraryItem | null;
export declare const useAudiobookIsLoading: () => boolean;
export declare const useAudiobookPosition: () => number;
export declare const useAudiobookDuration: () => number;
export declare const useAudiobookChapters: () => any;
export declare const useAudiobookError: () => null | string;
export declare const useAudiobookServer: () => null | ServerListItemWithCredential;
export declare const useAudiobookActions: () => AudiobookActions;

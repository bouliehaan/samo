import { type AbsPlaybackBaseActions, type AbsPlaybackCoreState } from '/@/renderer/store/abs-playback.store';
import { AudiobookshelfLibraryItem, AudiobookshelfPodcastEpisode } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
type PodcastExtra = {
    episode: AudiobookshelfPodcastEpisode | null;
};
type PodcastResume = {
    resumeByEpisodeKey: Record<string, number>;
};
export interface PodcastActions extends AbsPlaybackBaseActions {
    play: (server: ServerListItemWithCredential, item: AudiobookshelfLibraryItem, episode: AudiobookshelfPodcastEpisode) => Promise<void>;
    seekToNextEpisode: () => Promise<void>;
    seekToPreviousEpisode: () => Promise<void>;
}
export type PodcastState = AbsPlaybackCoreState & PodcastExtra & PodcastResume & {
    actions: PodcastActions;
};
declare const usePodcastStore: any;
export { usePodcastStore };
export declare const usePodcastContentUrl: () => null | string;
export declare const usePodcastItem: () => AudiobookshelfLibraryItem | null;
export declare const usePodcastEpisode: () => any;
export declare const usePodcastIsLoading: () => boolean;
export declare const usePodcastPosition: () => number;
export declare const usePodcastDuration: () => number;
export declare const usePodcastError: () => null | string;
export declare const usePodcastServer: () => null | ServerListItemWithCredential;
export declare const usePodcastActions: () => PodcastActions;

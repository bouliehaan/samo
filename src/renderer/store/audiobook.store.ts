import { type SamoAudiobookFileSegment } from '/@/renderer/api/samo/samo-audiobook-stream';
import { resolveSamoAudiobookPlaySession } from '/@/renderer/api/samo/samo-long-form';
import {
    type AbsPlaybackBaseActions,
    type AbsPlaybackCoreState,
    createAbsPlaybackStore,
} from '/@/renderer/store/abs-playback.store';
import { getCurrentChapterIndex } from '/@/renderer/store/audiobook-chapters';
import { useLastPlaybackSessionStore } from '/@/renderer/store/last-playback-session.store';
import { recordRecentAudiobook } from '/@/renderer/store/play-history.store';
import { usePlayerStoreBase } from '/@/renderer/store/player.store';
import { LongFormChapter, LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

export type { AudiobookChapterListItem } from '/@/renderer/store/audiobook-chapters';
export {
    getCurrentChapterIndex,
    getOrderedAudiobookChapters,
} from '/@/renderer/store/audiobook-chapters';

export interface AudiobookActions extends AbsPlaybackBaseActions {
    /**
     * `startSeconds` starts the book at an explicit point instead of the saved
     * progress — how "play this chapter" works from the detail page.
     */
    play: (
        server: ServerListItemWithCredential,
        item: LongFormLibraryItem,
        startSeconds?: number,
    ) => Promise<void>;
    seekToNextChapter: () => void;
    seekToPreviousChapter: () => void;
    setDuration: (seconds: number) => void;
}

export type AudiobookState = AbsPlaybackCoreState &
    AudiobookExtra &
    AudiobookResume & {
        actions: AudiobookActions;
    };

type AudiobookExtra = {
    /** Per-file manifest for whole-file streaming + cross-file seek switching. */
    audiobookFiles: SamoAudiobookFileSegment[];
    chapters: LongFormChapter[];
    /** Book-global start offset of the file currently loaded in the player. */
    streamOffsetSeconds: number;
};

type AudiobookResume = { resumeByItemId: Record<string, number> };

const rememberAudiobookPlaybackSession = (
    server: ServerListItemWithCredential,
    item: LongFormLibraryItem,
    position?: number,
) => {
    useLastPlaybackSessionStore.getState().actions.setSession({
        itemId: item.id,
        position,
        serverId: server.id,
        source: 'audiobook',
    });
};

const { selectors, store: useAudiobookStore } = createAbsPlaybackStore<
    AudiobookResume,
    AudiobookExtra,
    AudiobookActions,
    'resumeByItemId'
>({
    clearTransientExtra: () => ({ audiobookFiles: [], chapters: [], streamOffsetSeconds: 0 }),
    extendActions: ({ base, get, play, set }) => ({
        ...base,
        play: play as AudiobookActions['play'],
        seekToNextChapter: () => {
            const { chapters, duration, position } = get();
            const currentIndex = getCurrentChapterIndex(chapters, position, duration);
            if (currentIndex === -1) return;
            const nextIndex = currentIndex + 1;
            if (nextIndex >= chapters.length) return;
            const target = Math.max(0, chapters[nextIndex].start);
            usePlayerStoreBase.getState().mediaSeekToTimestamp(target);
        },
        seekToPreviousChapter: () => {
            const { chapters, duration, position } = get();
            const currentIndex = getCurrentChapterIndex(chapters, position, duration);
            if (currentIndex === -1) return;
            const currentStart = chapters[currentIndex].start;
            let target: number;
            if (position - currentStart > 5) {
                target = currentStart;
            } else if (currentIndex > 0) {
                target = chapters[currentIndex - 1].start;
            } else {
                target = 0;
            }
            usePlayerStoreBase.getState().mediaSeekToTimestamp(Math.max(0, target));
        },
        setDuration: (seconds) => {
            set({ duration: seconds });
        },
    }),
    failureToastLabel: 'Audiobook playback failed',
    getEpisodeForSync: () => null,
    getLoadingSeed: (_server, item) => ({
        audiobookFiles: [],
        chapters: (item as LongFormLibraryItem).media?.chapters ?? [],
        duration: (item as LongFormLibraryItem).media?.duration ?? 0,
        streamOffsetSeconds: 0,
    }),
    getResumeKey: (state) => (state.item ? state.item.id : null),
    initialExtra: { audiobookFiles: [], chapters: [], streamOffsetSeconds: 0 },
    logLabel: 'audiobook.store',
    persistName: 'audiobook-store',
    playArgsLabel: 'audiobook',
    recordRecent: recordRecentAudiobook,
    rememberSession: ({ item, position, server }) =>
        rememberAudiobookPlaybackSession(server, item, position),
    requiresEpisode: false,
    resolvePlaySession: async (_server, item, startSeconds) => {
        const server = _server as ServerListItemWithCredential;
        const libraryItem = item as LongFormLibraryItem;

        return resolveSamoAudiobookPlaySession(
            server,
            libraryItem,
            startSeconds as number | undefined,
        ) as any;
    },
    resumeField: 'resumeByItemId',
    resumeInitial: { resumeByItemId: {} },
    source: 'audiobook',
    updateResumeOnSeek: (state, position) => (state.item ? { key: state.item.id, position } : null),
});

export { useAudiobookStore };

export const useAudiobookContentUrl = selectors.useContentUrl;
export const useAudiobookItem = selectors.useItem;
export const useAudiobookIsLoading = selectors.useIsLoading;
export const useAudiobookPosition = selectors.usePosition;
export const useAudiobookDuration = selectors.useDuration;
export const useAudiobookChapters = () => useAudiobookStore((state) => state.chapters);
export const useAudiobookFiles = () => useAudiobookStore((state) => state.audiobookFiles);
export const useAudiobookStreamOffset = () =>
    useAudiobookStore((state) => state.streamOffsetSeconds);
export const useAudiobookError = selectors.useError;
export const useAudiobookServer = selectors.useServer;
export const useAudiobookActions = selectors.useActions;

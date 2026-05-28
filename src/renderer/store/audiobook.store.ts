import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import {
    resolveSamoAudiobookPlaySession,
} from '/@/renderer/api/samo/samo-long-form';
import {
    type AbsPlaybackBaseActions,
    type AbsPlaybackCoreState,
    createAbsPlaybackStore,
} from '/@/renderer/store/abs-playback.store';
import { getCurrentChapterIndex } from '/@/renderer/store/audiobook-chapters';
import { normalizeResumePosition } from '/@/renderer/store/audiobook-resume-math';
import { useLastPlaybackSessionStore } from '/@/renderer/store/last-playback-session.store';
import { recordRecentAudiobook } from '/@/renderer/store/play-history.store';
import { usePlayerStoreBase } from '/@/renderer/store/player.store';
import {
    AudiobookshelfChapter,
    AudiobookshelfLibraryItem,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential, ServerType } from '/@/shared/types/domain-types';

export type { AudiobookChapterListItem } from '/@/renderer/store/audiobook-chapters';
export {
    getCurrentChapterIndex,
    getOrderedAudiobookChapters,
} from '/@/renderer/store/audiobook-chapters';

export interface AudiobookActions extends AbsPlaybackBaseActions {
    play: (server: ServerListItemWithCredential, item: AudiobookshelfLibraryItem) => Promise<void>;
    seekToNextChapter: () => void;
    seekToPreviousChapter: () => void;
    setDuration: (seconds: number) => void;
}

export type AudiobookState = AbsPlaybackCoreState &
    AudiobookExtra &
    AudiobookResume & {
        actions: AudiobookActions;
    };

type AudiobookExtra = { chapters: AudiobookshelfChapter[] };

type AudiobookResume = { resumeByItemId: Record<string, number> };

const rememberAudiobookPlaybackSession = (
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
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
    clearTransientExtra: () => ({ chapters: [] }),
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
        chapters: (item as AudiobookshelfLibraryItem).media?.chapters ?? [],
        duration: (item as AudiobookshelfLibraryItem).media?.duration ?? 0,
    }),
    getResumeKey: (state) => (state.item ? state.item.id : null),
    initialExtra: { chapters: [] },
    logLabel: 'audiobook.store',
    persistName: 'audiobook-store',
    playArgsLabel: 'audiobook',
    recordRecent: recordRecentAudiobook,
    rememberSession: ({ item, position, server }) =>
        rememberAudiobookPlaybackSession(server, item, position),
    requiresEpisode: false,
    resolvePlaySession: async (_server, item) => {
        const server = _server as ServerListItemWithCredential;
        const libraryItem = item as AudiobookshelfLibraryItem;

        if (server.type === ServerType.SAMO) {
            return resolveSamoAudiobookPlaySession(server, libraryItem);
        }

        const session = await audiobookshelfController.playItem(server, libraryItem.id);
        const contentUrl = session.audioTracks?.[0]?.contentUrl;

        if (!contentUrl) {
            throw new Error('Audiobookshelf did not return an audio URL');
        }

        const chapters = session.libraryItem?.media?.chapters ?? libraryItem.media?.chapters ?? [];
        const duration = session.libraryItem?.media?.duration ?? libraryItem.media?.duration ?? 0;
        const localResume = useAudiobookStore.getState().resumeByItemId[libraryItem.id];
        const serverResume = session.currentTime ?? 0;
        const resumePosition = localResume !== undefined ? localResume : serverResume;

        return {
            contentUrl,
            duration,
            item: libraryItem,
            patch: { chapters },
            position: normalizeResumePosition(resumePosition, duration),
            sessionId: session.id ?? null,
        };
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
export const useAudiobookError = selectors.useError;
export const useAudiobookServer = selectors.useServer;
export const useAudiobookActions = selectors.useActions;

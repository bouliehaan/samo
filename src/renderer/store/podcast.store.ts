import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import {
    resolveSamoPodcastPlaySession,
} from '/@/renderer/api/samo/samo-long-form';
import {
    type AbsPlaybackBaseActions,
    type AbsPlaybackCoreState,
    createAbsPlaybackStore,
} from '/@/renderer/store/abs-playback.store';
import { normalizeResumePosition } from '/@/renderer/store/audiobook-resume-math';
import { useLastPlaybackSessionStore } from '/@/renderer/store/last-playback-session.store';
import { recordRecentPodcast } from '/@/renderer/store/play-history.store';
import {
    AudiobookshelfLibraryItem,
    AudiobookshelfPodcastEpisode,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential, ServerType } from '/@/shared/types/domain-types';

const resumeKey = (itemId: string, episodeId: string) => `${itemId}::${episodeId}`;

export interface PodcastActions extends AbsPlaybackBaseActions {
    play: (
        server: ServerListItemWithCredential,
        item: AudiobookshelfLibraryItem,
        episode: AudiobookshelfPodcastEpisode,
    ) => Promise<void>;
    seekToNextEpisode: () => Promise<void>;
    seekToPreviousEpisode: () => Promise<void>;
}

export type PodcastState = AbsPlaybackCoreState &
    PodcastExtra &
    PodcastResume & {
        actions: PodcastActions;
    };

type PodcastExtra = { episode: AudiobookshelfPodcastEpisode | null };

type PodcastResume = { resumeByEpisodeKey: Record<string, number> };

const rememberPodcastPlaybackSession = (
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
    episode: AudiobookshelfPodcastEpisode,
    position?: number,
) => {
    useLastPlaybackSessionStore.getState().actions.setSession({
        episodeId: episode.id,
        itemId: item.id,
        position,
        serverId: server.id,
        source: 'podcast',
    });
};

const sortedEpisodes = (item: AudiobookshelfLibraryItem) =>
    (item.media?.episodes ?? [])
        .slice()
        .sort((a, b) => (a.publishedAt ?? 0) - (b.publishedAt ?? 0));

const { selectors, store: usePodcastStore } = createAbsPlaybackStore<
    PodcastResume,
    PodcastExtra,
    PodcastActions,
    'resumeByEpisodeKey'
>({
    clearTransientExtra: () => ({ episode: null }),
    extendActions: ({ base, get, play }) => ({
        ...base,
        play: play as PodcastActions['play'],
        seekToNextEpisode: async () => {
            const { episode, item, server } = get();
            if (!item || !episode || !server) return;

            const episodes = sortedEpisodes(item);
            const currentIndex = episodes.findIndex((e) => e.id === episode.id);
            if (currentIndex === -1 || currentIndex + 1 >= episodes.length) return;

            await get().actions.play(server, item, episodes[currentIndex + 1]);
        },
        seekToPreviousEpisode: async () => {
            const { episode, item, server } = get();
            if (!item || !episode || !server) return;

            const episodes = sortedEpisodes(item);
            const currentIndex = episodes.findIndex((e) => e.id === episode.id);
            if (currentIndex <= 0) return;

            await get().actions.play(server, item, episodes[currentIndex - 1]);
        },
    }),
    failureToastLabel: 'Podcast playback failed',
    getEpisodeForSync: (state) => state.episode,
    getLoadingSeed: (_server, _item, episode) => {
        const ep = episode as AudiobookshelfPodcastEpisode;
        return {
            duration: ep.duration ?? ep.audioFile?.duration ?? 0,
            episode: ep,
        };
    },
    getResumeKey: (state) =>
        state.item && state.episode ? resumeKey(state.item.id, state.episode.id) : null,
    initialExtra: { episode: null },
    logLabel: 'podcast.store',
    onLoseOwnershipExtra: (state) => {
        if (state.item && state.episode && state.server) {
            rememberPodcastPlaybackSession(state.server, state.item, state.episode, state.position);
        }
    },
    persistName: 'podcast-store',
    playArgsLabel: 'podcast',
    recordRecent: recordRecentPodcast,
    rememberSession: ({ episode, item, position, server }) => {
        if (!episode) return;
        rememberPodcastPlaybackSession(server, item, episode, position);
    },
    requiresEpisode: true,
    resolvePlaySession: async (_server, item, episode) => {
        const server = _server as ServerListItemWithCredential;
        const libraryItem = item as AudiobookshelfLibraryItem;
        const ep = episode as AudiobookshelfPodcastEpisode;

        if (server.type === ServerType.SAMO) {
            return resolveSamoPodcastPlaySession(server, libraryItem, ep);
        }

        const session = await audiobookshelfController.playItem(server, libraryItem.id, ep.id);
        const contentUrl = session.audioTracks?.[0]?.contentUrl;

        if (!contentUrl) {
            throw new Error('Audiobookshelf did not return an audio URL');
        }

        const seedDuration = ep.duration ?? ep.audioFile?.duration ?? 0;
        const localResume =
            usePodcastStore.getState().resumeByEpisodeKey[resumeKey(libraryItem.id, ep.id)];
        const serverResume = session.currentTime ?? 0;
        const resumePosition = localResume !== undefined ? localResume : serverResume;

        const playSessionEpisode = session.libraryItem?.media?.episodes?.find(
            (e) => e.id === ep.id,
        );
        const duration =
            playSessionEpisode?.duration ?? playSessionEpisode?.audioFile?.duration ?? seedDuration;

        const sessionEpisodes = session.libraryItem?.media?.episodes;
        const itemToStore =
            sessionEpisodes && sessionEpisodes.length > 0 ? session.libraryItem! : libraryItem;

        return {
            contentUrl,
            duration,
            episode: playSessionEpisode ?? ep,
            item: itemToStore,
            position: normalizeResumePosition(resumePosition, duration),
            sessionId: session.id ?? null,
        };
    },
    resumeField: 'resumeByEpisodeKey',
    resumeInitial: { resumeByEpisodeKey: {} },
    source: 'podcast',
    updateResumeOnSeek: (state, position) =>
        state.item && state.episode
            ? { key: resumeKey(state.item.id, state.episode.id), position }
            : null,
});

export { usePodcastStore };

export const usePodcastContentUrl = selectors.useContentUrl;
export const usePodcastItem = selectors.useItem;
export const usePodcastEpisode = () => usePodcastStore((state) => state.episode);
export const usePodcastIsLoading = selectors.useIsLoading;
export const usePodcastPosition = selectors.usePosition;
export const usePodcastDuration = selectors.useDuration;
export const usePodcastError = selectors.useError;
export const usePodcastServer = selectors.useServer;
export const usePodcastActions = selectors.useActions;

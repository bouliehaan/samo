import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { useEffect, useRef } from 'react';

import { getSongById } from '/@/renderer/features/player/utils';
import { listSamoAudiobookLibraryItems, loadSamoPodcastLibraryItem } from '/@/renderer/api/samo/samo-long-form';
import { useRadioStore as useRadioPlayerStore } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useRadioStore as useRadioStationStore } from '/@/renderer/features/radio/store/radio-store';
import { useAudiobookStore } from '/@/renderer/store/audiobook.store';
import { getServerById } from '/@/renderer/store/auth.store';
import {
    isStructuredMusicContext,
    type LastPlaybackSession,
    rememberMusicPlaybackSession,
    SONG_CONTEXT,
    useLastPlaybackSessionStore,
} from '/@/renderer/store/last-playback-session.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import {
    getCurrentSong,
    getQueue,
    usePlayerHydrated,
    usePlayerStoreBase,
} from '/@/renderer/store/player.store';
import { usePodcastStore } from '/@/renderer/store/podcast.store';
import { useSettingsStore } from '/@/renderer/store/settings.store';
import { setTimestamp } from '/@/renderer/store/timestamp.store';
import { PlayerType } from '/@/shared/types/types';

const claimMusicPlayback = () => {
    const playbackType = useSettingsStore.getState().playback.type;
    usePlaybackOwnerStore.getState().claim('music', {
        engine: isElectron() && playbackType === PlayerType.LOCAL ? 'mpv-native' : 'web',
    });
};

const restoreAudiobookSession = async (
    session: Extract<LastPlaybackSession, { source: 'audiobook' }>,
) => {
    const server = getServerById(session.serverId);
    if (!server) return false;

    const listResult = await listSamoAudiobookLibraryItems(server);
    const item = (listResult as any).results.find((i: any) => i.id === session.itemId) as any;
    if (!item) return false;
    if (usePlaybackOwnerStore.getState().source) return true;

    const position =
        session.position ?? useAudiobookStore.getState().resumeByItemId[session.itemId] ?? 0;

    useAudiobookStore.setState((state) => ({
        chapters: item.media?.chapters ?? [],
        contentUrl: null,
        duration: item.media?.duration ?? 0,
        error: null,
        isLoading: false,
        item,
        position,
        resumeByItemId: {
            ...state.resumeByItemId,
            [session.itemId]: position,
        },
        server,
        sessionId: null,
    }));
    usePlaybackOwnerStore.getState().claim('audiobook', {
        engine: 'web',
        mediaKey: session.itemId,
    });
    return true;
};

const restorePodcastSession = async (
    session: Extract<LastPlaybackSession, { source: 'podcast' }>,
) => {
    const server = getServerById(session.serverId);
    if (!server) return false;

    const item = await loadSamoPodcastLibraryItem(server, session.itemId);
    const episode = item.media?.episodes?.find((candidate) => candidate.id === session.episodeId);
    if (!episode) return false;
    if (usePlaybackOwnerStore.getState().source) return true;

    const resumeKey = `${session.itemId}::${session.episodeId}`;
    const duration = episode.duration ?? episode.audioFile?.duration ?? 0;
    const position =
        session.position ?? usePodcastStore.getState().resumeByEpisodeKey[resumeKey] ?? 0;
    const clampedPosition =
        duration > 0 ? Math.min(Math.max(0, position), duration) : Math.max(0, position);

    usePodcastStore.setState((state) => ({
        contentUrl: null,
        duration,
        episode,
        error: null,
        isLoading: false,
        item,
        position: clampedPosition,
        resumeByEpisodeKey: {
            ...state.resumeByEpisodeKey,
            [resumeKey]: clampedPosition,
        },
        server,
        sessionId: null,
    }));
    usePlaybackOwnerStore.getState().claim('podcast', {
        engine: 'web',
        mediaKey: `${session.itemId}:${session.episodeId}`,
    });
    return true;
};

const restoreMusicSession = async (
    session: Extract<LastPlaybackSession, { source: 'music' }>,
    queryClient: QueryClient,
) => {
    if (usePlaybackOwnerStore.getState().source) return true;

    const player = usePlayerStoreBase.getState();
    const persistedQueue = getQueue(undefined, player);
    const queueAlreadyRestored = persistedQueue.items.length > 0;
    const restoredQueueContext = player.player.context ?? session.context;

    // Album / playlist contexts: zustand-persist already rehydrated the queue + index
    // (the partialize gate let it through). Trust the hydrated player context over the
    // session context because the session is only metadata and can lag behind by one write.
    if (queueAlreadyRestored && isStructuredMusicContext(restoredQueueContext)) {
        claimMusicPlayback();
        if (typeof session.position === 'number') {
            setTimestamp(session.position);
        }

        const song = getCurrentSong(player);
        rememberMusicPlaybackSession({
            context: restoredQueueContext,
            position: session.position,
            songRef:
                song?.id && song?._serverId
                    ? { serverId: song._serverId, songId: song.id }
                    : undefined,
        });

        return true;
    }

    // Single-song lifeboat: queue wasn't persisted (kind: 'song'). Fetch the saved
    // track by id and seed a one-track queue paused at the saved position. The user
    // has to press play to resume — we never auto-play on launch.
    if (!session.songRef) return false;
    const { serverId, songId } = session.songRef;
    const server = getServerById(serverId);
    if (!server) return false;

    try {
        const songResponse = await getSongById({ id: songId, queryClient, serverId });
        const song = songResponse.items[0];
        if (!song) return false;

        // Re-claim must happen after fetch resolves in case another source claimed in
        // the meantime (e.g. user opened a podcast before this resolved).
        if (usePlaybackOwnerStore.getState().source) return true;

        const position = session.position ?? 0;
        usePlayerStoreBase
            .getState()
            .setQueue([song], 0, position, SONG_CONTEXT, /* autoPlay */ false);
        setTimestamp(position);
        return true;
    } catch {
        return false;
    }
};

const restoreRadioSession = (session: Extract<LastPlaybackSession, { source: 'radio' }>) => {
    const station = useRadioStationStore
        .getState()
        .actions.getStation(session.serverId, session.stationId);
    const streamUrl = station?.streamUrl || session.streamUrl || null;
    if (!streamUrl) return false;
    if (usePlaybackOwnerStore.getState().source) return true;

    const stationArt = {
        id: station?.id ?? session.stationId,
        imageId: station?.imageId ?? session.stationArt?.imageId ?? null,
        imageUrl: station?.imageUrl ?? session.stationArt?.imageUrl ?? null,
        serverId: session.serverId,
    };

    useRadioPlayerStore.setState({
        currentStationArt: stationArt,
        currentStreamUrl: streamUrl,
        isPlaying: false,
        metadata: session.metadata ?? null,
        stationName: station?.name || session.stationName || null,
    });
    usePlaybackOwnerStore.getState().claim('radio', { engine: 'web', mediaKey: streamUrl });
    return true;
};

export const useRestoreLastPlaybackSession = () => {
    const hasRestoredRef = useRef(false);
    const playerHydrated = usePlayerHydrated();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!playerHydrated) return;
        if (hasRestoredRef.current) return;
        hasRestoredRef.current = true;

        const session = useLastPlaybackSessionStore.getState().session;
        if (!session) return;

        const restore = async () => {
            try {
                let didRestore = true;
                if (session.source === 'audiobook') {
                    didRestore = await restoreAudiobookSession(session);
                } else if (session.source === 'podcast') {
                    didRestore = await restorePodcastSession(session);
                } else if (session.source === 'radio') {
                    didRestore = restoreRadioSession(session);
                } else if (session.source === 'music') {
                    didRestore = await restoreMusicSession(session, queryClient);
                }

                if (!didRestore) {
                    useLastPlaybackSessionStore.getState().actions.clear();
                }
            } catch {
                // Temporary network failures should fall back for this launch
                // without forgetting the saved target.
            }
        };

        restore();
    }, [playerHydrated, queryClient]);
};

export const RestoreLastPlaybackSessionHook = () => {
    useRestoreLastPlaybackSession();
    return null;
};

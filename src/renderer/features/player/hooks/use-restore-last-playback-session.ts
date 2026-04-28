import { useEffect, useRef } from 'react';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { useRadioStore as useRadioPlayerStore } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useRadioStore as useRadioStationStore } from '/@/renderer/features/radio/store/radio-store';
import { getServerById } from '/@/renderer/store/auth.store';
import { useAudiobookStore } from '/@/renderer/store/audiobook.store';
import {
    type LastPlaybackSession,
    useLastPlaybackSessionStore,
} from '/@/renderer/store/last-playback-session.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { usePodcastStore } from '/@/renderer/store/podcast.store';

const restoreAudiobookSession = async (
    session: Extract<LastPlaybackSession, { source: 'audiobook' }>,
) => {
    const server = getServerById(session.serverId);
    if (!server) return false;

    const item = await audiobookshelfController.getItem(server, session.itemId);
    if (usePlaybackOwnerStore.getState().source) return true;

    const position =
        session.position ??
        useAudiobookStore.getState().resumeByItemId[session.itemId] ??
        0;

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
    usePlaybackOwnerStore.getState().claim('audiobook');
    return true;
};

const restorePodcastSession = async (
    session: Extract<LastPlaybackSession, { source: 'podcast' }>,
) => {
    const server = getServerById(session.serverId);
    if (!server) return false;

    const item = await audiobookshelfController.getItem(server, session.itemId);
    const episode = item.media?.episodes?.find((candidate) => candidate.id === session.episodeId);
    if (!episode) return false;
    if (usePlaybackOwnerStore.getState().source) return true;

    const resumeKey = `${session.itemId}::${session.episodeId}`;
    const duration = episode.duration ?? episode.audioFile?.duration ?? 0;
    const position =
        session.position ??
        usePodcastStore.getState().resumeByEpisodeKey[resumeKey] ??
        0;
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
    usePlaybackOwnerStore.getState().claim('podcast');
    return true;
};

const restoreRadioSession = (
    session: Extract<LastPlaybackSession, { source: 'radio' }>,
) => {
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
    usePlaybackOwnerStore.getState().claim('radio');
    return true;
};

export const useRestoreLastPlaybackSession = () => {
    const hasRestoredRef = useRef(false);

    useEffect(() => {
        if (hasRestoredRef.current) return;
        hasRestoredRef.current = true;

        const session = useLastPlaybackSessionStore.getState().session;
        if (!session || session.source === 'music') return;

        const restore = async () => {
            try {
                let didRestore = true;
                if (session.source === 'audiobook') {
                    didRestore = await restoreAudiobookSession(session);
                } else if (session.source === 'podcast') {
                    didRestore = await restorePodcastSession(session);
                } else if (session.source === 'radio') {
                    didRestore = restoreRadioSession(session);
                }

                if (!didRestore) {
                    useLastPlaybackSessionStore.getState().actions.clear();
                }
            } catch {
                // Temporary ABS/network failures should fall back for this launch
                // without forgetting the saved target.
            }
        };

        restore();
    }, []);
};

export const RestoreLastPlaybackSessionHook = () => {
    useRestoreLastPlaybackSession();
    return null;
};

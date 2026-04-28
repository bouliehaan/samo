import type ReactPlayer from 'react-player';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    WebPlayerEngine,
    WebPlayerEngineHandle,
} from '/@/renderer/features/player/audio-player/engine/web-player-engine';
import { PlayerOnProgressProps } from '/@/renderer/features/player/audio-player/types';
import { useWebAudio } from '/@/renderer/features/player/hooks/use-webaudio';
import {
    subscribePlayerSeekToTimestamp,
    subscribePlayerStatus,
    usePlaybackSettings,
    usePlayerMuted,
    usePlayerStoreBase,
    usePlayerVolume,
} from '/@/renderer/store';
import {
    usePodcastActions,
    usePodcastContentUrl,
    usePodcastPosition,
    usePodcastStore,
} from '/@/renderer/store/podcast.store';
import { toast } from '/@/shared/components/toast/toast';
import { PlayerStatus } from '/@/shared/types/types';

/**
 * Podcast playback engine. Mirrors AudiobookWebPlayer because the only real
 * difference between an audiobook play session and a podcast play session is
 * URL semantics — both produce a single audio stream that we play through the
 * shared WebPlayerEngine and report progress on.
 *
 * Differences from audiobooks: no chapters, no chapter-aware seek seeding —
 * just resume from saved position per episode.
 */
export function PodcastWebPlayer() {
    const playerRef = useRef<null | WebPlayerEngineHandle>(null);
    const contentUrl = usePodcastContentUrl();
    const resumePosition = usePodcastPosition();
    const { release, seekTo, setPosition } = usePodcastActions();
    const isMuted = usePlayerMuted();
    const volume = usePlayerVolume();
    const { preservePitch } = usePlaybackSettings();
    const { webAudio } = useWebAudio();

    // Mirror AudiobookWebPlayer: initialise from store so an already-PLAYING
    // status (e.g. user was playing music when they tapped an episode) doesn't
    // get missed by the subscription.
    const [playerStatus, setPlayerStatus] = useState<PlayerStatus>(
        () => usePlayerStoreBase.getState().player.status,
    );

    const hasSeededRef = useRef(false);
    const currentUrlRef = useRef<null | string>(null);

    useEffect(() => {
        if (contentUrl !== currentUrlRef.current) {
            hasSeededRef.current = false;
            currentUrlRef.current = contentUrl;
        }
    }, [contentUrl]);

    // --- WebAudio source wiring (mirrors AudiobookWebPlayer/RadioWebPlayer) ---
    const [player1Source, setPlayer1Source] = useState<MediaElementAudioSourceNode | null>(null);
    const processedMediaElementRef = useRef<HTMLMediaElement | null>(null);
    const player1SourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    useEffect(() => {
        player1SourceRef.current = player1Source;
    }, [player1Source]);

    useEffect(() => {
        return () => {
            if (player1SourceRef.current) {
                try {
                    player1SourceRef.current.disconnect();
                } catch {
                    // Ignore disconnect errors on cleanup.
                }
                setPlayer1Source(null);
                processedMediaElementRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!webAudio || !player1Source) return;
        const gainValue = isMuted ? 0 : volume / 100;
        try {
            webAudio.gains[0].gain.setValueAtTime(gainValue, 0);
        } catch {
            // Ignore gain errors.
        }
    }, [volume, isMuted, webAudio, player1Source]);

    useEffect(() => {
        setPlayerStatus(usePlayerStoreBase.getState().player.status);
        const unsub = subscribePlayerStatus(({ status }) => {
            setPlayerStatus(status);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = subscribePlayerSeekToTimestamp(({ timestamp }) => {
            // Only handle seek when we actually own playback.
            if (!usePodcastStore.getState().contentUrl) return;
            playerRef.current?.seekTo(timestamp);
            seekTo(timestamp);
        });
        return unsub;
    }, [seekTo]);

    const handleStarted = useCallback(
        async (player: ReactPlayer) => {
            if (webAudio) {
                const internal = player.getInternalPlayer() as HTMLMediaElement | undefined;
                if (internal && processedMediaElementRef.current !== internal) {
                    if (webAudio.context.state !== 'running') {
                        await webAudio.context.resume();
                    }
                    try {
                        const { context, gains } = webAudio;
                        const source = context.createMediaElementSource(internal);
                        source.connect(gains[0]);
                        setPlayer1Source(source);
                        processedMediaElementRef.current = internal;
                    } catch {
                        processedMediaElementRef.current = internal;
                    }
                }
            }

            // Seek to resume position on first play of this URL.
            if (!hasSeededRef.current && resumePosition > 0) {
                playerRef.current?.seekTo(resumePosition);
                hasSeededRef.current = true;
            }
        },
        [webAudio, resumePosition],
    );

    const handleProgress = useCallback(
        (e: PlayerOnProgressProps) => {
            setPosition(e.playedSeconds);
        },
        [setPosition],
    );

    const handleNoOp = useCallback(() => {}, []);

    const handleEnded = useCallback(() => {
        // Episode finished — reset its saved position so next play starts fresh.
        const { episode, item } = usePodcastStore.getState();
        if (item && episode) {
            usePodcastStore.setState((state) => ({
                resumeByEpisodeKey: {
                    ...state.resumeByEpisodeKey,
                    [`${item.id}::${episode.id}`]: 0,
                },
            }));
        }
        release();
    }, [release]);

    const handleError = useCallback(() => {
        toast.error({ message: 'Podcast playback error — check the stream URL.' });
        release();
    }, [release]);

    if (!contentUrl) {
        return null;
    }

    return (
        <WebPlayerEngine
            isMuted={isMuted}
            isTransitioning={false}
            onEndedPlayer1={handleEnded}
            onEndedPlayer2={() => {}}
            onErrorPause={handleError}
            onProgressPlayer1={handleProgress}
            onProgressPlayer2={() => {}}
            onStartedPlayer1={handleStarted}
            onStartedPlayer2={handleNoOp}
            playerNum={1}
            playerRef={playerRef}
            playerStatus={playerStatus}
            preservesPitch={preservePitch}
            speed={1}
            src1={contentUrl}
            src2={undefined}
            volume={volume}
        />
    );
}

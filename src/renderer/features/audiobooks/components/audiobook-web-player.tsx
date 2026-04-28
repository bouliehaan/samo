import type ReactPlayer from 'react-player';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    WebPlayerEngine,
    WebPlayerEngineHandle,
} from '/@/renderer/features/player/audio-player/engine/web-player-engine';
import { PlayerOnProgressProps } from '/@/renderer/features/player/audio-player/types';
import { useWebAudio } from '/@/renderer/features/player/hooks/use-webaudio';
import {
    useAudiobookActions,
    useAudiobookContentUrl,
    useAudiobookPosition,
    useAudiobookStore,
} from '/@/renderer/store/audiobook.store';
import {
    subscribePlayerSeekToTimestamp,
    subscribePlayerStatus,
    usePlaybackSettings,
    usePlayerMuted,
    usePlayerStoreBase,
    usePlayerVolume,
} from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';
import { PlayerStatus } from '/@/shared/types/types';

export function AudiobookWebPlayer() {
    const playerRef = useRef<null | WebPlayerEngineHandle>(null);
    const contentUrl = useAudiobookContentUrl();
    const resumePosition = useAudiobookPosition();
    const { setPosition, setDuration, seekTo, release } = useAudiobookActions();
    const isMuted = usePlayerMuted();
    const volume = usePlayerVolume();
    const { preservePitch } = usePlaybackSettings();
    const { webAudio } = useWebAudio();

    // Local play/pause state driven by the universal transport.
    // Initialise synchronously from the store so we don't miss PLAYING status that was
    // already set before this component mounted (e.g. music was playing when the user tapped
    // an audiobook, claim fires, WebPlayer unmounts, but player.status is still PLAYING).
    const [playerStatus, setPlayerStatus] = useState<PlayerStatus>(
        () => usePlayerStoreBase.getState().player.status,
    );

    // Track whether we've done the initial seek to the resume position.
    const hasSeededRef = useRef(false);
    const currentUrlRef = useRef<null | string>(null);

    // Reset seed flag whenever the content URL changes (new book started).
    useEffect(() => {
        if (contentUrl !== currentUrlRef.current) {
            hasSeededRef.current = false;
            currentUrlRef.current = contentUrl;
        }
    }, [contentUrl]);

    // --- WebAudio source wiring (mirrors RadioWebPlayer) ---
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

    // --- Subscribe to universal transport status ---
    useEffect(() => {
        console.log('[AudiobookWebPlayer] mounted, subscribing to player status');
        // Reconcile in case the status changed between the initial useState() read and now.
        const initialStatus = usePlayerStoreBase.getState().player.status;
        setPlayerStatus(initialStatus);
        console.log('[AudiobookWebPlayer] initial status from store:', initialStatus);

        const unsub = subscribePlayerStatus(({ status }) => {
            console.log('[AudiobookWebPlayer] player status changed →', status);
            setPlayerStatus(status);
        });
        return () => {
            console.log('[AudiobookWebPlayer] unmounting');
            unsub();
        };
    }, []);

    // --- Subscribe to seek-to-timestamp events ---
    useEffect(() => {
        const unsub = subscribePlayerSeekToTimestamp(({ timestamp }) => {
            // Guard: only handle seek when we own playback.
            const source = useAudiobookStore.getState();
            if (!source.contentUrl) return;

            playerRef.current?.seekTo(timestamp);
            seekTo(timestamp);
        });
        return unsub;
    }, [seekTo]);

    // --- Handlers ---
    const handleStarted = useCallback(
        async (player: ReactPlayer) => {
            // Wire into WebAudio graph (same logic as RadioWebPlayer).
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

            // Capture total duration once the player is ready.
            const duration = player.getDuration();
            console.log('[AudiobookWebPlayer] player ready', {
                duration,
                resumePosition,
                hasSeeded: hasSeededRef.current,
            });
            if (duration && isFinite(duration)) {
                setDuration(duration);
            }

            // Seek to resume position on first play of this URL.
            if (!hasSeededRef.current && resumePosition > 0) {
                playerRef.current?.seekTo(resumePosition);
                hasSeededRef.current = true;
            }
        },
        [webAudio, resumePosition, setDuration],
    );

    const handleProgress = useCallback(
        (e: PlayerOnProgressProps) => {
            setPosition(e.playedSeconds);
        },
        [setPosition],
    );

    const handleNoOp = useCallback((_player: ReactPlayer) => {}, []);

    const handleEnded = useCallback(() => {
        // Book finished — save position at 0 so next play starts from beginning.
        const { item } = useAudiobookStore.getState();
        if (item) {
            useAudiobookStore.setState((state) => ({
                resumeByItemId: { ...state.resumeByItemId, [item.id]: 0 },
            }));
        }
        release();
    }, [release]);

    const handleError = useCallback(() => {
        toast.error({ message: 'Audiobook playback error — check the stream URL.' });
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

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
import { toast } from '/@/shared/components/toast/toast';
import { PlayerStatus } from '/@/shared/types/types';
import { logFn, LogCategory } from '/@/renderer/utils/logger';

export type WebMediaEngineMode = 'abs-resume' | 'radio';

export interface WebMediaEngineProps {
    contentUrl: string | null;
    errorMessage: string;
    isActive: boolean;
    mode: WebMediaEngineMode;
    onEnded: () => void;
    onError: () => void;
    onProgress?: (playedSeconds: number) => void;
    onSeekTransport?: (timestamp: number) => void;
    ownsPlayback: () => boolean;
    releaseOnError: () => void;
    resetResumeOnEnd?: () => void;
    resumePosition?: number;
    /** Radio drives status from `isPlaying` instead of universal transport. */
    statusFromRadio?: boolean;
    radioIsPlaying?: boolean;
    syncVolumeToEngineRef?: boolean;
}

export function WebMediaEngine({
    contentUrl,
    errorMessage,
    isActive,
    mode,
    onEnded,
    onError,
    onProgress,
    onSeekTransport,
    ownsPlayback,
    releaseOnError,
    resetResumeOnEnd,
    resumePosition = 0,
    statusFromRadio = false,
    radioIsPlaying = false,
    syncVolumeToEngineRef = false,
}: WebMediaEngineProps) {
    const playerRef = useRef<null | WebPlayerEngineHandle>(null);
    const isMuted = usePlayerMuted();
    const volume = usePlayerVolume();
    const { preservePitch } = usePlaybackSettings();
    const { webAudio } = useWebAudio();

    const [playerStatus, setPlayerStatus] = useState<PlayerStatus>(() => {
        if (statusFromRadio) {
            return radioIsPlaying ? PlayerStatus.PLAYING : PlayerStatus.PAUSED;
        }
        return usePlayerStoreBase.getState().player.status;
    });

    const hasSeededRef = useRef(false);
    const currentUrlRef = useRef<null | string>(null);

    useEffect(() => {
        if (mode !== 'abs-resume') return;
        if (contentUrl !== currentUrlRef.current) {
            hasSeededRef.current = false;
            currentUrlRef.current = contentUrl;
        }
    }, [contentUrl, mode]);

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
        if (syncVolumeToEngineRef) {
            playerRef.current?.setVolume(volume);
        }
    }, [volume, syncVolumeToEngineRef]);

    useEffect(() => {
        if (statusFromRadio) {
            setPlayerStatus(radioIsPlaying ? PlayerStatus.PLAYING : PlayerStatus.PAUSED);
            return;
        }

        setPlayerStatus(usePlayerStoreBase.getState().player.status);
        const unsub = subscribePlayerStatus(({ status }) => {
            setPlayerStatus(status);
        });
        return unsub;
    }, [statusFromRadio, radioIsPlaying]);

    useEffect(() => {
        if (mode !== 'abs-resume') return;

        const unsub = subscribePlayerSeekToTimestamp(({ timestamp }) => {
            if (!ownsPlayback()) return;
            playerRef.current?.seekTo(timestamp);
            onSeekTransport?.(timestamp);
        });
        return unsub;
    }, [mode, onSeekTransport, ownsPlayback]);

    const wireWebAudio = useCallback(
        async (player: ReactPlayer, options?: { allowReuseSource?: boolean }) => {
            if (!webAudio) return;

            const internal = player.getInternalPlayer() as HTMLMediaElement | undefined;
            if (!internal) return;

            if (
                options?.allowReuseSource &&
                processedMediaElementRef.current === internal &&
                player1Source
            ) {
                try {
                    if (!player1Source.context) {
                        player1Source.connect(webAudio.gains[0]);
                    }
                } catch {
                    // Already connected.
                }
                return;
            }

            if (processedMediaElementRef.current === internal) {
                return;
            }

            if (contentUrl && webAudio.context.state !== 'running') {
                await webAudio.context.resume();
            }

            try {
                const source = webAudio.context.createMediaElementSource(internal);
                source.connect(webAudio.gains[0]);
                setPlayer1Source(source);
                processedMediaElementRef.current = internal;
            } catch {
                processedMediaElementRef.current = internal;
                if (webAudio.gains[0]) {
                    const gainValue = isMuted ? 0 : volume / 100;
                    webAudio.gains[0].gain.setValueAtTime(gainValue, 0);
                }
            }
        },
        [contentUrl, isMuted, player1Source, volume, webAudio],
    );

    const handleStarted = useCallback(
        async (player: ReactPlayer) => {
            await wireWebAudio(player, { allowReuseSource: mode === 'radio' });

            if (mode === 'abs-resume' && !hasSeededRef.current && resumePosition > 0) {
                playerRef.current?.seekTo(resumePosition);
                hasSeededRef.current = true;
            }
        },
        [mode, resumePosition, wireWebAudio],
    );

    const handleProgress = useCallback(
        (e: PlayerOnProgressProps) => {
            onProgress?.(e.playedSeconds);
        },
        [onProgress],
    );

    const handleEnded = useCallback(() => {
        resetResumeOnEnd?.();
        onEnded();
    }, [onEnded, resetResumeOnEnd]);

    const handleError = useCallback(() => {
        onError();
        toast.error({ message: errorMessage });
        releaseOnError();
    }, [errorMessage, onError, releaseOnError]);

    const handleRadioEnded = useCallback(() => {
        logFn.error('Radio stream ended unexpectedly', { category: LogCategory.PLAYER });
        onEnded();
        toast.error({ message: 'Radio stream ended unexpectedly' });
    }, [onEnded]);

    if (!isActive || !contentUrl) {
        return null;
    }

    return (
        <WebPlayerEngine
            isMuted={isMuted}
            isTransitioning={false}
            onEndedPlayer1={mode === 'radio' ? handleRadioEnded : handleEnded}
            onEndedPlayer2={() => {}}
            onErrorPause={mode === 'radio' ? () => {} : handleError}
            onProgressPlayer1={onProgress ? handleProgress : () => {}}
            onProgressPlayer2={() => {}}
            onStartedPlayer1={handleStarted}
            onStartedPlayer2={() => {}}
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

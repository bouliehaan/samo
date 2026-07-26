import type ReactPlayer from 'react-player';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    WebPlayerEngine,
    WebPlayerEngineHandle,
} from '/@/renderer/features/player/audio-player/engine/web-player-engine';
import { PlayerOnProgressProps } from '/@/renderer/features/player/audio-player/types';
import { useWebAudio } from '/@/renderer/features/player/hooks/use-webaudio';
import {
    subscribePlayerSeek,
    subscribePlayerStatus,
    usePlaybackSettings,
    usePlayerStoreBase,
    usePlayerVolumeState,
} from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';
import { PlayerStatus } from '/@/shared/types/types';
import { LogCategory, logFn } from '/@/shared/utils/logger';

export type WebMediaEngineMode = 'abs-resume' | 'radio';

export interface WebMediaEngineProps {
    contentUrl: null | string;
    errorMessage: string;
    isActive: boolean;
    mode: WebMediaEngineMode;
    onEnded: () => void;
    onError: () => void;
    onProgress?: (playedSeconds: number) => void;
    /** Re-open the stream at `bookPosition` when seek is before the current origin. */
    onRestartStreamAt?: (bookPosition: number) => Promise<void> | void;
    onSeekTransport?: (timestamp: number) => void;
    ownsPlayback: () => boolean;
    radioIsPlaying?: boolean;
    releaseOnError: () => void;
    resetResumeOnEnd?: () => void;
    resumePosition?: number;
    /** Radio drives status from `isPlaying` instead of universal transport. */
    statusFromRadio?: boolean;
    /**
     * Length of the stream currently loaded, when it covers only PART of the
     * book-global timeline (one file of a multi-file audiobook). A seek past its
     * end can't be served locally, so it re-opens through `onRestartStreamAt`
     * instead. Omit for streams that span the whole timeline.
     */
    streamDurationSeconds?: number;
    /**
     * When the stream URL starts at a book-global offset (Samo `progressSeconds`),
     * player time 0 is that offset — add this to progress and subtract on seek.
     */
    streamOffsetSeconds?: number;
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
    onRestartStreamAt,
    onSeekTransport,
    ownsPlayback,
    radioIsPlaying = false,
    releaseOnError,
    resetResumeOnEnd,
    resumePosition = 0,
    statusFromRadio = false,
    streamDurationSeconds = 0,
    streamOffsetSeconds = 0,
    syncVolumeToEngineRef = false,
}: WebMediaEngineProps) {
    const playerRef = useRef<null | WebPlayerEngineHandle>(null);
    const { muted: isMuted, volume } = usePlayerVolumeState();
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

        const unsub = subscribePlayerSeek(({ timestamp }) => {
            if (!ownsPlayback()) return;

            const bookPosition = Math.max(0, timestamp);

            // Outside the span the loaded stream covers — in EITHER direction.
            // Forward used to fall through to the local seek below, which asked
            // the media element for a time past its end: it clamped, fired
            // `ended`, and the ended handler advanced to the NEXT file while the
            // transport was still switching to the TARGET file. Whichever landed
            // last won, so a forward seek across a file boundary could drop you
            // in the wrong chapter. Re-open at the target instead.
            const beforeStream = bookPosition < streamOffsetSeconds - 0.25;
            const afterStream =
                streamDurationSeconds > 0 &&
                bookPosition >= streamOffsetSeconds + streamDurationSeconds;

            if ((beforeStream || afterStream) && onRestartStreamAt) {
                void onRestartStreamAt(bookPosition);
                onSeekTransport?.(bookPosition);
                return;
            }

            const filePosition = Math.max(0, bookPosition - streamOffsetSeconds);
            playerRef.current?.seekTo(filePosition);
            onSeekTransport?.(bookPosition);
        });
        return unsub;
    }, [
        mode,
        onRestartStreamAt,
        onSeekTransport,
        ownsPlayback,
        streamDurationSeconds,
        streamOffsetSeconds,
    ]);

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
                const filePosition = Math.max(0, resumePosition - streamOffsetSeconds);
                playerRef.current?.seekTo(filePosition);
                hasSeededRef.current = true;
            }
        },
        [mode, resumePosition, streamOffsetSeconds, wireWebAudio],
    );

    const handleProgress = useCallback(
        (e: PlayerOnProgressProps) => {
            onProgress?.(e.playedSeconds + streamOffsetSeconds);
        },
        [onProgress, streamOffsetSeconds],
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

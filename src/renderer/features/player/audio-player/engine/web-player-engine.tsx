import type { RefObject } from 'react';
import type ReactPlayer from 'react-player';

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import {
    registerAudioElement,
    stopAudioElement,
    unregisterAudioElement,
    warnIfMultipleAudiblePlaybackElements,
} from '/@/renderer/features/player/audio-player/audio-element-registry';
import { AudioPlayer, PlayerOnProgressProps } from '/@/renderer/features/player/audio-player/types';
import { convertToLogVolume } from '/@/renderer/features/player/audio-player/utils/player-utils';
import { usePlaybackSession } from '/@/renderer/store/playback-owner.store';
import { PlayerStatus } from '/@/shared/types/types';
import { LogCategory, logFn } from '/@/shared/utils/logger';
import { logMsg } from '/@/shared/utils/logger-message';

export interface WebPlayerEngineHandle extends AudioPlayer {
    player1(): {
        ref: null | ReactPlayer;
        setVolume: (volume: number) => void;
    };
    player2(): {
        ref: null | ReactPlayer;
        setVolume: (volume: number) => void;
    };
}

interface WebPlayerEngineProps {
    isMuted: boolean;
    isTransitioning: boolean;
    onEndedPlayer1: () => void;
    onEndedPlayer2: () => void;
    onErrorPause: () => void;
    onProgressPlayer1: (e: PlayerOnProgressProps) => void;
    onProgressPlayer2: (e: PlayerOnProgressProps) => void;
    onStartedPlayer1: (player: ReactPlayer) => void;
    onStartedPlayer2: (player: ReactPlayer) => void;
    playerNum: number;
    playerRef: RefObject<null | WebPlayerEngineHandle>;
    playerStatus: PlayerStatus;
    preservesPitch: boolean;
    speed?: number;
    src1: string | undefined;
    src2: string | undefined;
    volume: number;
}

const MAX_NETWORK_RETRIES = 5;
const NETWORK_RETRY_DELAY_MS = 2000;

// Credits: https://gist.github.com/novwhisky/8a1a0168b94f3b6abfaa?permalink_comment_id=1551393#gistcomment-1551393
// This is used so that the player will always have an <audio> element. This means that
// player1Source and player2Source are connected BEFORE the user presses play for
// the first time. This workaround is important for Safari, which seems to require the
// source to be connected PRIOR to resuming audio context
const EMPTY_SOURCE =
    'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV';

export const WebPlayerEngine = (props: WebPlayerEngineProps) => {
    const {
        isMuted,
        isTransitioning,
        onEndedPlayer1,
        onEndedPlayer2,
        onErrorPause,
        onProgressPlayer1,
        onProgressPlayer2,
        onStartedPlayer1,
        onStartedPlayer2,
        playerNum,
        playerRef,
        playerStatus,
        preservesPitch,
        speed,
        src1,
        src2,
        volume,
    } = props;

    const playbackSession = usePlaybackSession();
    const player1Ref = useRef<null | ReactPlayer>(null);
    const player2Ref = useRef<null | ReactPlayer>(null);
    const ownedAudioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());
    const playbackSessionIdRef = useRef(playbackSession.id);
    const playbackSessionSourceRef = useRef(playbackSession.source);
    const src1Ref = useRef(src1);
    const src2Ref = useRef(src2);
    const networkRetryCount1 = useRef(0);
    const networkRetryCount2 = useRef(0);
    const networkRetryTimeout1 = useRef<null | ReturnType<typeof setTimeout>>(null);
    const networkRetryTimeout2 = useRef<null | ReturnType<typeof setTimeout>>(null);
    const [ReactPlayerComponent, setReactPlayerComponent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    playbackSessionIdRef.current = playbackSession.id;
    playbackSessionSourceRef.current = playbackSession.source;
    src1Ref.current = src1;
    src2Ref.current = src2;

    useEffect(() => {
        let isMounted = true;

        const loadReactPlayer = async () => {
            try {
                const module = await import('react-player');
                if (isMounted) {
                    setReactPlayerComponent(() => module.default);
                    setIsLoading(false);
                }
            } catch (error) {
                logFn.error('Failed to load react-player', { meta: { error: error } });
                setIsLoading(false);
            }
        };

        loadReactPlayer();

        return () => {
            isMounted = false;
        };
    }, []);

    const [internalVolume1, setInternalVolume1] = useState(volume / 100 || 0);
    const [internalVolume2, setInternalVolume2] = useState(volume / 100 || 0);

    const clearAudioElement = useCallback((player: null | ReactPlayer) => {
        const internal = player?.getInternalPlayer();
        if (!(internal instanceof HTMLAudioElement)) return;

        stopAudioElement(internal);
    }, []);

    const clearInactivePlayer = useCallback(() => {
        if (playerNum === 1) {
            clearAudioElement(player2Ref.current);
        } else {
            clearAudioElement(player1Ref.current);
        }
    }, [clearAudioElement, playerNum]);

    const clearAllAudioElements = useCallback(() => {
        clearAudioElement(player1Ref.current);
        clearAudioElement(player2Ref.current);
    }, [clearAudioElement]);

    const clearNetworkRetryTimers = useCallback(() => {
        if (networkRetryTimeout1.current) {
            clearTimeout(networkRetryTimeout1.current);
            networkRetryTimeout1.current = null;
        }
        if (networkRetryTimeout2.current) {
            clearTimeout(networkRetryTimeout2.current);
            networkRetryTimeout2.current = null;
        }
    }, []);

    useImperativeHandle<WebPlayerEngineHandle, WebPlayerEngineHandle>(playerRef, () => ({
        decreaseVolume(by: number) {
            setInternalVolume1(Math.max(0, internalVolume1 - by / 100));
            setInternalVolume2(Math.max(0, internalVolume2 - by / 100));
        },
        increaseVolume(by: number) {
            setInternalVolume1(Math.min(1, internalVolume1 + by / 100));
            setInternalVolume2(Math.min(1, internalVolume2 + by / 100));
        },
        pause() {
            player1Ref.current?.getInternalPlayer()?.pause();
            player2Ref.current?.getInternalPlayer()?.pause();
        },
        play() {
            player1Ref.current?.getInternalPlayer()?.pause();
            player2Ref.current?.getInternalPlayer()?.pause();
            clearInactivePlayer();
            if (playerNum === 1) {
                player1Ref.current?.getInternalPlayer()?.play();
            } else {
                player2Ref.current?.getInternalPlayer()?.play();
            }
        },
        player1() {
            return {
                ref: player1Ref?.current,
                setVolume: (volume: number) => setInternalVolume1(volume / 100 || 0),
            };
        },
        player2() {
            return {
                ref: player2Ref?.current,
                setVolume: (volume: number) => setInternalVolume2(volume / 100 || 0),
            };
        },
        seekTo(seekTo: number) {
            playerNum === 1
                ? player1Ref.current?.seekTo(seekTo)
                : player2Ref.current?.seekTo(seekTo);
        },
        setVolume(volume: number) {
            setInternalVolume1(volume / 100 || 0);
            setInternalVolume2(volume / 100 || 0);
        },
        setVolume1(volume: number) {
            setInternalVolume1(volume / 100 || 0);
        },
        setVolume2(volume: number) {
            setInternalVolume2(volume / 100 || 0);
        },
    }));

    const volume1 = convertToLogVolume(internalVolume1);
    const volume2 = convertToLogVolume(internalVolume2);

    const pauseBothPlayers = useCallback(() => {
        player1Ref.current?.getInternalPlayer()?.pause();
        player2Ref.current?.getInternalPlayer()?.pause();
    }, []);

    const registerPlayerAudioElement = useCallback(
        (player: null | ReactPlayer, playerId: string, mediaKey?: string) => {
            const internal = player?.getInternalPlayer();
            if (!(internal instanceof HTMLAudioElement)) return null;

            ownedAudioElementsRef.current.add(internal);
            internal.preservesPitch = preservesPitch;
            registerAudioElement(internal, {
                mediaKey: mediaKey ?? null,
                playerId,
                sessionId: playbackSession.id,
                source: playbackSession.source,
            });

            return internal;
        },
        [playbackSession.id, playbackSession.source, preservesPitch],
    );

    const handleOnError = (
        playerRef: React.RefObject<null | ReactPlayer>,
        playerId: string,
        sourceRef: React.RefObject<string | undefined>,
        onEnded: () => void,
        onErrorPause: () => void,
        networkRetryCountRef: React.RefObject<number>,
        retryTimeoutRef: React.RefObject<null | ReturnType<typeof setTimeout>>,
    ) => {
        return ({ target }: ErrorEvent) => {
            const { current: player } = playerRef;

            if (!player || !(target instanceof HTMLAudioElement)) {
                return;
            }

            const { error } = target;

            logFn.error(logMsg[LogCategory.PLAYER].playbackError, {
                category: LogCategory.PLAYER,
                meta: { error },
            });

            const isNetworkError =
                error?.code === MediaError.MEDIA_ERR_NETWORK ||
                error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;

            if (isNetworkError) {
                if (networkRetryCountRef.current < MAX_NETWORK_RETRIES) {
                    networkRetryCountRef.current += 1;
                    const audio = target;
                    const scheduledSessionId = playbackSessionIdRef.current;
                    const scheduledSource = sourceRef.current;
                    if (retryTimeoutRef.current) {
                        clearTimeout(retryTimeoutRef.current);
                    }
                    retryTimeoutRef.current = setTimeout(() => {
                        retryTimeoutRef.current = null;
                        if (
                            playbackSessionIdRef.current !== scheduledSessionId ||
                            sourceRef.current !== scheduledSource
                        ) {
                            return;
                        }
                        registerAudioElement(audio, {
                            mediaKey: scheduledSource ?? null,
                            playerId,
                            sessionId: playbackSessionIdRef.current,
                            source: playbackSessionSourceRef.current,
                        });
                        pauseBothPlayers();
                        audio.load();
                        audio.play().catch(() => {
                            logFn.error(logMsg[LogCategory.PLAYER].playbackError, {
                                category: LogCategory.PLAYER,
                                meta: { error: 'Failed to play audio after network error' },
                            });
                        });
                    }, NETWORK_RETRY_DELAY_MS);
                    return;
                }
            }

            if (error?.code !== MediaError.MEDIA_ERR_DECODE && !isNetworkError) {
                return;
            }

            pauseBothPlayers();
            if (error?.code === MediaError.MEDIA_ERR_DECODE) {
                onEnded();
            } else {
                if (onErrorPause) {
                    onErrorPause();
                }
            }
        };
    };

    useEffect(() => {
        networkRetryCount1.current = 0;
        networkRetryCount2.current = 0;
        clearNetworkRetryTimers();
    }, [clearNetworkRetryTimers, playbackSession.id, src1, src2]);

    useEffect(() => clearNetworkRetryTimers, [clearNetworkRetryTimers]);

    // When not transitioning, ensure only the active player can play (e.g. after seek/prev during transition)
    useEffect(() => {
        if (isTransitioning) return;
        if (playerStatus !== PlayerStatus.PLAYING) {
            pauseBothPlayers();
            return;
        }
        if (playerNum === 1) {
            clearAudioElement(player2Ref.current);
        } else {
            clearAudioElement(player1Ref.current);
        }
    }, [clearAudioElement, isTransitioning, playerNum, playerStatus, pauseBothPlayers]);

    useEffect(() => {
        const player1 = player1Ref.current?.getInternalPlayer();
        if (player1 && player1 instanceof HTMLAudioElement) {
            player1.preservesPitch = preservesPitch;
        }
        const player2 = player2Ref.current?.getInternalPlayer();
        if (player2 && player2 instanceof HTMLAudioElement) {
            player2.preservesPitch = preservesPitch;
        }
    }, [preservesPitch]);

    useEffect(() => clearAllAudioElements, [clearAllAudioElements]);

    useEffect(() => {
        registerPlayerAudioElement(player1Ref.current, 'web-player-1', src1);
        registerPlayerAudioElement(player2Ref.current, 'web-player-2', src2);
    }, [registerPlayerAudioElement, src1, src2]);

    const handleOnReadyPlayer1 = useCallback(
        (player: ReactPlayer) => {
            registerPlayerAudioElement(player, 'web-player-1', src1);
            onStartedPlayer1(player);
        },
        [onStartedPlayer1, registerPlayerAudioElement, src1],
    );

    const handleOnReadyPlayer2 = useCallback(
        (player: ReactPlayer) => {
            registerPlayerAudioElement(player, 'web-player-2', src2);
            onStartedPlayer2(player);
        },
        [onStartedPlayer2, registerPlayerAudioElement, src2],
    );

    // Pause + unregister via captured refs, not via player1Ref/player2Ref —
    // those are null by the time this cleanup runs because React unmounts
    // children (the ReactPlayer instances) before parent cleanups fire.
    useEffect(() => {
        const owned = ownedAudioElementsRef.current;

        return () => {
            owned.forEach((audio) => unregisterAudioElement(audio));
            owned.clear();
        };
    }, []);

    if (isLoading || !ReactPlayerComponent) {
        return <div id="web-player-engine" style={{ display: 'none' }} />;
    }

    return (
        <div id="web-player-engine" style={{ display: 'none' }}>
            <ReactPlayerComponent
                config={{
                    file: { attributes: { crossOrigin: 'anonymous' }, forceAudio: true },
                }}
                controls={false}
                height={0}
                id="web-player-1"
                muted={isMuted}
                onEnded={src1 ? () => onEndedPlayer1() : undefined}
                onError={handleOnError(
                    player1Ref,
                    'web-player-1',
                    src1Ref,
                    () => onEndedPlayer1(),
                    onErrorPause,
                    networkRetryCount1,
                    networkRetryTimeout1,
                )}
                onPlay={warnIfMultipleAudiblePlaybackElements}
                onProgress={onProgressPlayer1}
                onReady={handleOnReadyPlayer1}
                playbackRate={speed || 1}
                playing={playerNum === 1 && playerStatus === PlayerStatus.PLAYING}
                progressInterval={isTransitioning ? 10 : 250}
                ref={player1Ref}
                url={src1 || EMPTY_SOURCE}
                volume={volume1}
                width={0}
            />
            <ReactPlayerComponent
                config={{
                    file: { attributes: { crossOrigin: 'anonymous' }, forceAudio: true },
                }}
                controls={false}
                height={0}
                id="web-player-2"
                muted={isMuted}
                onEnded={src2 ? () => onEndedPlayer2() : undefined}
                onError={handleOnError(
                    player2Ref,
                    'web-player-2',
                    src2Ref,
                    () => onEndedPlayer2(),
                    onErrorPause,
                    networkRetryCount2,
                    networkRetryTimeout2,
                )}
                onPlay={warnIfMultipleAudiblePlaybackElements}
                onProgress={onProgressPlayer2}
                onReady={handleOnReadyPlayer2}
                playbackRate={speed || 1}
                playing={playerNum === 2 && playerStatus === PlayerStatus.PLAYING}
                progressInterval={isTransitioning ? 10 : 250}
                ref={player2Ref}
                url={src2 || EMPTY_SOURCE}
                volume={volume2}
                width={0}
            />
        </div>
    );
};

WebPlayerEngine.displayName = 'WebPlayerEngine';

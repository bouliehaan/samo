import isElectron from 'is-electron';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { getSongUrl } from '/@/renderer/features/player/audio-player/hooks/use-stream-url';
import { setClockAnchor, setClockPlaying, setClockSpeed, } from '/@/renderer/features/player/audio-player/playback-clock';
import { usePlaybackSettings, usePlayerActions, usePlayerData, usePlayerMpvEngineState, } from '/@/renderer/store';
import { LogCategory, logFn } from '/@/renderer/utils/logger';
import { toast } from '/@/shared/components/toast/toast';
import { PlayerStatus } from '/@/shared/types/types';
const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const mpvPlayerListener = isElectron() ? window.api.mpvPlayerListener : null;
const ipc = isElectron() ? window.api.ipc : null;
const DIRECT_STREAM_CONFIG = {
    enabled: false,
};
const getMpvProperties = (playback, muted, speed) => {
    const { mpvAudioDeviceId, mpvProperties: { audioExclusiveMode, audioFormat, audioSampleRateHz, gaplessAudio, replayGainClip, replayGainFallbackDB, replayGainMode, replayGainPreampDB, }, } = playback;
    return {
        ...(mpvAudioDeviceId ? { 'audio-device': mpvAudioDeviceId } : {}),
        ...(audioFormat ? { 'audio-format': audioFormat } : {}),
        ...(audioSampleRateHz ? { 'audio-samplerate': audioSampleRateHz } : {}),
        'audio-exclusive': audioExclusiveMode,
        'gapless-audio': gaplessAudio,
        mute: muted,
        replaygain: replayGainMode,
        'replaygain-clip': replayGainClip ? 'yes' : 'no',
        ...(replayGainFallbackDB !== undefined
            ? { 'replaygain-fallback': replayGainFallbackDB }
            : {}),
        'replaygain-preamp': replayGainPreampDB ?? 0,
        speed,
    };
};
const getDirectSongUrl = (song) => {
    if (!song) {
        return Promise.resolve(undefined);
    }
    return getSongUrl(song, DIRECT_STREAM_CONFIG, true);
};
export const MpvPlayer = () => {
    const playback = usePlaybackSettings();
    const playerData = usePlayerData();
    const { muted, speed, volume } = usePlayerMpvEngineState();
    const { mediaAutoNext, setTimestamp } = usePlayerActions();
    const { currentSong, nextSong, status } = playerData;
    const [isReady, setIsReady] = useState(false);
    const currentSongIdRef = useRef(undefined);
    const nextSongIdRef = useRef(undefined);
    const queueSyncEpochRef = useRef(0);
    const statusRef = useRef(status);
    const mediaAutoNextRef = useRef(mediaAutoNext);
    const mpvProperties = useMemo(() => getMpvProperties(playback, muted, speed), [muted, playback, speed]);
    useEffect(() => {
        statusRef.current = status;
    }, [status]);
    useEffect(() => {
        mediaAutoNextRef.current = mediaAutoNext;
    }, [mediaAutoNext]);
    useEffect(() => {
        if (!mpvPlayer) {
            return;
        }
        let cancelled = false;
        const initialize = async () => {
            try {
                const isRunning = await mpvPlayer.isRunning();
                // The unmount cleanup IPC can arrive at main before this point
                // returns. Bailing here prevents a stale spawn from outliving
                // the component and leaking an orphan mpv process.
                if (cancelled)
                    return;
                if (!isRunning) {
                    await mpvPlayer.initialize({
                        extraParameters: playback.mpvExtraParameters,
                        properties: mpvProperties,
                    });
                }
                else {
                    mpvPlayer.setProperties(mpvProperties);
                }
                if (cancelled)
                    return;
                const initialized = await mpvPlayer.isRunning();
                if (cancelled)
                    return;
                if (!initialized) {
                    throw new Error('MPV did not start');
                }
                setIsReady(true);
                mpvPlayer.volume(volume);
            }
            catch (error) {
                logFn.error('Failed to initialize native music playback', {
                    category: LogCategory.PLAYER,
                    meta: { error },
                });
                toast.error({
                    message: 'Native playback failed to start. Web compatibility is available in playback settings, but it will use the browser audio engine.',
                    title: 'Native playback unavailable',
                });
            }
        };
        initialize();
        return () => {
            cancelled = true;
            setIsReady(false);
            currentSongIdRef.current = undefined;
            nextSongIdRef.current = undefined;
            void mpvPlayer.cleanup();
        };
        // MPV process parameters only apply at process startup; live property changes are handled below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (!isReady || !mpvPlayer) {
            return;
        }
        mpvPlayer.setProperties(mpvProperties);
    }, [isReady, mpvProperties]);
    useEffect(() => {
        if (!isReady || !mpvPlayer) {
            return;
        }
        mpvPlayer.volume(volume);
    }, [isReady, volume]);
    usePlayerEvents({
        onPlayerMute: ({ muted }) => {
            mpvPlayer?.mute(muted);
        },
        onPlayerSeekToTimestamp: ({ timestamp }) => {
            mpvPlayer?.seekTo(timestamp);
        },
        onPlayerSpeed: ({ speed }) => {
            mpvPlayer?.setProperties({ speed });
        },
        onPlayerStatus: ({ status }) => {
            if (status === PlayerStatus.PLAYING) {
                mpvPlayer?.play();
            }
            else {
                mpvPlayer?.pause();
            }
        },
        onPlayerVolume: ({ volume }) => {
            mpvPlayer?.volume(volume);
        },
        onQueueCleared: () => {
            mpvPlayer?.setQueue(undefined, undefined, true);
        },
    }, []);
    const syncQueue = useCallback(async () => {
        if (!isReady || !mpvPlayer) {
            return;
        }
        const epoch = queueSyncEpochRef.current + 1;
        queueSyncEpochRef.current = epoch;
        const currentSongId = currentSong?._uniqueId;
        const nextSongId = nextSong?._uniqueId;
        const currentSongChanged = currentSongIdRef.current !== currentSongId;
        const nextSongChanged = nextSongIdRef.current !== nextSongId;
        if (!currentSong) {
            currentSongIdRef.current = undefined;
            nextSongIdRef.current = undefined;
            await mpvPlayer.setQueue(undefined, undefined, true);
            return;
        }
        if (!currentSongChanged && !nextSongChanged) {
            return;
        }
        try {
            if (currentSongChanged) {
                const [currentUrl, nextUrl] = await Promise.all([
                    getDirectSongUrl(currentSong),
                    getDirectSongUrl(nextSong),
                ]);
                if (queueSyncEpochRef.current !== epoch || !currentUrl) {
                    return;
                }
                currentSongIdRef.current = currentSongId;
                nextSongIdRef.current = nextSongId;
                await mpvPlayer.setQueue(currentUrl, nextUrl, statusRef.current !== PlayerStatus.PLAYING);
                return;
            }
            const nextUrl = await getDirectSongUrl(nextSong);
            if (queueSyncEpochRef.current !== epoch) {
                return;
            }
            nextSongIdRef.current = nextSongId;
            await mpvPlayer.setQueueNext(nextUrl);
        }
        catch (error) {
            logFn.error('Failed to sync native playback queue', {
                category: LogCategory.PLAYER,
                meta: {
                    currentSongId,
                    error,
                    nextSongId,
                },
            });
        }
    }, [currentSong, isReady, nextSong]);
    useEffect(() => {
        syncQueue();
    }, [syncQueue]);
    useEffect(() => {
        if (!mpvPlayer || !mpvPlayerListener || !ipc) {
            return;
        }
        const handleCurrentTime = (_event, time) => {
            setTimestamp(time);
            setClockAnchor({ isPlaying: true, timeSec: time });
        };
        const handleAutoNext = async () => {
            const previousSongId = currentSongIdRef.current;
            const nextPlayerData = mediaAutoNextRef.current();
            const nextCurrentSong = nextPlayerData.currentSong;
            const followingSong = nextPlayerData.nextSong;
            const followingUrl = await getDirectSongUrl(followingSong);
            try {
                if (nextCurrentSong?._uniqueId && nextCurrentSong._uniqueId === previousSongId) {
                    const repeatedUrl = await getDirectSongUrl(nextCurrentSong);
                    if (repeatedUrl) {
                        currentSongIdRef.current = nextCurrentSong._uniqueId;
                        nextSongIdRef.current = followingSong?._uniqueId;
                        await mpvPlayer.setQueue(repeatedUrl, followingUrl, nextPlayerData.status !== PlayerStatus.PLAYING);
                    }
                }
                else {
                    currentSongIdRef.current = nextCurrentSong?._uniqueId;
                    nextSongIdRef.current = followingSong?._uniqueId;
                    await mpvPlayer.autoNext(followingUrl);
                }
                if (nextPlayerData.status !== PlayerStatus.PLAYING) {
                    mpvPlayer.pause();
                }
            }
            catch (error) {
                logFn.error('Failed to advance native playback queue', {
                    category: LogCategory.PLAYER,
                    meta: { error },
                });
            }
        };
        const handleFallback = (_event, isError) => {
            if (!isError) {
                return;
            }
            toast.error({
                message: 'Native playback failed. Switch to Web compatibility in playback settings only if you accept browser-engine playback.',
                title: 'Native playback unavailable',
            });
        };
        mpvPlayerListener.rendererCurrentTime(handleCurrentTime);
        mpvPlayerListener.rendererAutoNext(handleAutoNext);
        mpvPlayerListener.rendererPlayerFallback(handleFallback);
        return () => {
            ipc.removeListener('renderer-player-current-time', handleCurrentTime);
            ipc.removeListener('renderer-player-auto-next', handleAutoNext);
            ipc.removeListener('renderer-player-fallback', handleFallback);
        };
    }, [setTimestamp]);
    useEffect(() => {
        mpvPlayer?.updateMetadata(playerData);
    }, [playerData]);
    useEffect(() => {
        setClockPlaying(status === PlayerStatus.PLAYING);
    }, [status]);
    useEffect(() => {
        setClockSpeed(speed ?? 1);
    }, [speed]);
    return null;
};

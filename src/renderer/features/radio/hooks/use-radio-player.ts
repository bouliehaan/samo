import IcecastMetadataStats from 'icecast-metadata-stats';
import isElectron from 'is-electron';
import React, { useEffect } from 'react';
import { createWithEqualityFn } from 'zustand/traditional';

import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { usePlaybackType, usePlayerStoreBase, useSettingsStore } from '/@/renderer/store';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';

export type RadioCurrentStationArt = {
    id: string;
    imageId?: null | string;
    imageUrl?: null | string;
    serverId: string;
};

export interface RadioMetadata {
    artist: null | string;
    title: null | string;
}

interface RadioStore {
    actions: {
        pause: () => void;
        play: (
            streamUrl?: string,
            stationName?: string,
            stationArt?: null | RadioCurrentStationArt,
        ) => void;
        setCurrentStreamUrl: (currentStreamUrl: null | string) => void;
        setIsPlaying: (isPlaying: boolean) => void;
        setMetadata: (metadata: null | RadioMetadata) => void;
        setStationName: (stationName: null | string) => void;
        stop: () => void;
    };
    currentStationArt: null | RadioCurrentStationArt;
    currentStreamUrl: null | string;
    isPlaying: boolean;
    metadata: null | RadioMetadata;
    stationName: null | string;
}

export const useRadioStore = createWithEqualityFn<RadioStore>((set) => ({
    actions: {
        pause: () => {
            set({ isPlaying: false });
            usePlayerStoreBase.getState().mediaPause();
        },
        play: (
            streamUrl?: string,
            stationName?: string,
            stationArt?: null | RadioCurrentStationArt,
        ) => {
            set((state) => {
                const newStreamUrl = streamUrl ?? state.currentStreamUrl;
                const newStationName = stationName ?? state.stationName;

                if (!newStreamUrl) {
                    return state;
                }

                const streamUrlExplicit = streamUrl !== undefined;
                const isSwitchingStation =
                    streamUrlExplicit && streamUrl !== state.currentStreamUrl;

                let nextStationArt = state.currentStationArt;
                if (isSwitchingStation) {
                    nextStationArt = stationArt ?? null;
                }

                usePlayerStoreBase.getState().mediaPlay();

                return {
                    currentStationArt: nextStationArt,
                    currentStreamUrl: newStreamUrl,
                    isPlaying: true,
                    metadata: isSwitchingStation ? null : state.metadata,
                    stationName: newStationName,
                };
            });
        },
        setCurrentStreamUrl: (currentStreamUrl) => set({ currentStreamUrl }),
        setIsPlaying: (isPlaying) => set({ isPlaying }),
        setMetadata: (metadata) => set({ metadata }),
        setStationName: (stationName) => set({ stationName }),
        stop: () => {
            const playbackType = useSettingsStore.getState().playback.type;

            set({
                currentStationArt: null,
                currentStreamUrl: null,
                isPlaying: false,
                metadata: null,
                stationName: null,
            });

            if (playbackType === PlayerType.LOCAL && mpvPlayer) {
                usePlayerStoreBase.getState().mediaStop();
            } else {
                usePlayerStoreBase.getState().mediaStop();
            }
        },
    },
    currentStationArt: null,
    currentStreamUrl: null,
    isPlaying: false,
    metadata: null,
    stationName: null,
}));

export const useIsPlayingRadio = () => useRadioStore((state) => state.isPlaying);

if (typeof window !== 'undefined') {
    window.addEventListener('samo:clear-radio', () => {
        useRadioStore.setState({
            currentStationArt: null,
            currentStreamUrl: null,
            isPlaying: false,
            metadata: null,
            stationName: null,
        });
    });
}

export const useIsRadioActive = () => useRadioStore((state) => Boolean(state.currentStreamUrl));


export const useRadioPlayer = () => {
    const currentStationArt = useRadioStore((state) => state.currentStationArt);
    const currentStreamUrl = useRadioStore((state) => state.currentStreamUrl);
    const isPlaying = useRadioStore((state) => state.isPlaying);
    const metadata = useRadioStore((state) => state.metadata);
    const stationName = useRadioStore((state) => state.stationName);

    return {
        currentStationArt,
        currentStreamUrl,
        isPlaying,
        metadata,
        stationName,
    };
};

export const useRadioControls = () => {
    const { pause, play, stop } = useRadioStore((state) => state.actions);

    return {
        pause,
        play,
        stop,
    };
};

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const shouldUseMpvRadioMetadata = Boolean(mpvPlayer?.getStreamMetadata);
const mpvPlayerListener = isElectron() ? window.api.mpvPlayerListener : null;
const ipc = isElectron() ? window.api.ipc : null;

export const useRadioAudioInstance = () => {
    const { actions } = useRadioStore();
    const { setCurrentStreamUrl, setIsPlaying, setStationName } = actions;
    const currentStreamUrl = useRadioStore((state) => state.currentStreamUrl);
    const isPlaying = useRadioStore((state) => state.isPlaying);
    const isRadioActive = useIsRadioActive();
    const playbackType = usePlaybackType();
    const isUsingMpv = playbackType === PlayerType.LOCAL && mpvPlayer;

    // Handle mpv playback
    useEffect(() => {
        if (!isUsingMpv || !mpvPlayer) {
            return;
        }

        if (currentStreamUrl) {
            mpvPlayer.setQueue(currentStreamUrl, undefined, !isPlaying);
        } else {
            mpvPlayer.pause();
        }
    }, [
        currentStreamUrl,
        isPlaying,
        isUsingMpv,
        setIsPlaying,
        setCurrentStreamUrl,
        setStationName,
    ]);

    useEffect(() => {
        if (!isUsingMpv || !mpvPlayerListener || !ipc || !isRadioActive) {
            return;
        }

        const handleMpvPlay = () => {
            setIsPlaying(true);
        };

        const handleMpvPause = () => {
            setIsPlaying(false);
        };

        const handleMpvStop = () => {
            setIsPlaying(false);
            setCurrentStreamUrl(null);
            setStationName(null);
            useRadioStore.setState({ currentStationArt: null, metadata: null });
        };

        mpvPlayerListener.rendererPlay(handleMpvPlay);
        mpvPlayerListener.rendererPause(handleMpvPause);
        mpvPlayerListener.rendererStop(handleMpvStop);

        return () => {
            ipc.removeAllListeners('renderer-player-play');
            ipc.removeAllListeners('renderer-player-pause');
            ipc.removeAllListeners('renderer-player-stop');
        };
    }, [isUsingMpv, isRadioActive, setIsPlaying, setCurrentStreamUrl, setStationName]);

    usePlayerEvents(
        {
            onPlayerStatus: (properties, prev) => {
                const radioState = useRadioStore.getState();
                if (!radioState.currentStreamUrl) {
                    return;
                }

                const { status } = properties;
                const { status: prevStatus } = prev;

                if (status === prevStatus) {
                    return;
                }

                if (status === PlayerStatus.PLAYING && prevStatus === PlayerStatus.PAUSED) {
                    actions.play();
                } else if (status === PlayerStatus.PAUSED && prevStatus === PlayerStatus.PLAYING) {
                    actions.pause();
                }
            },
        },
        [actions],
    );
};

export const useRadioMetadata = () => {
    const currentStreamUrl = useRadioStore((state) => state.currentStreamUrl);
    const isPlaying = useRadioStore((state) => state.isPlaying);
    const setMetadata = useRadioStore((state) => state.actions.setMetadata);

    useEffect(() => {
        if (!currentStreamUrl || !isPlaying) {
            setMetadata(null);
            return;
        }

        // Electron/local mode: prefer MPV metadata because browser-side ICY fetches
        // are commonly blocked by CORS.
        if (shouldUseMpvRadioMetadata && mpvPlayer) {
            let stopped = false;

            const pollMetadata = async () => {
                try {
                    const metadata = await mpvPlayer.getStreamMetadata(currentStreamUrl);

                    if (!stopped) {
                        setMetadata(metadata);
                    }
                } catch (error) {
                    if (!stopped) {
                        setMetadata(null);
                    }
                }
            };

            pollMetadata();
            const interval = window.setInterval(pollMetadata, 5000);

            return () => {
                stopped = true;
                window.clearInterval(interval);
                setMetadata(null);
            };
        }

        // Web fallback: use IcecastMetadataStats. This can fail under browser CORS,
        // but is still useful outside Electron/MPV mode.
        let statsListener: IcecastMetadataStats | null = null;

        try {
            statsListener = new IcecastMetadataStats(currentStreamUrl, {
                interval: 12,
                onStats: (stats) => {
                    let streamTitle: null | string = null;

                    if (stats.StreamTitle) {
                        streamTitle = stats.StreamTitle;
                    } else if (stats.icy?.StreamTitle) {
                        streamTitle = stats.icy.StreamTitle;
                    }

                    let artist: null | string = null;
                    let title: null | string = null;

                    if (streamTitle) {
                        const match = streamTitle.match(/^(.*?)\s*[-–—]\s*(.+)$/);

                        if (match) {
                            artist = match[1].trim() || null;
                            title = match[2].trim() || null;
                        } else {
                            title = streamTitle;
                        }
                    }

                    setMetadata(title || artist ? { artist, title } : null);
                },
                sources: ['icy'],
            });

            statsListener.start();
        } catch {
            setMetadata(null);
        }

        return () => {
            if (statsListener) {
                statsListener.stop();
            }

            setMetadata(null);
        };
    }, [currentStreamUrl, isPlaying, setMetadata]);
};

const RadioAudioInstanceHookInner = () => {
    useRadioAudioInstance();
    return null;
};

export const RadioAudioInstanceHook = () => {
    const isRadioActive = useIsRadioActive();

    if (!isRadioActive) {
        return null;
    }

    return React.createElement(RadioAudioInstanceHookInner);
};

const RadioMetadataHookInner = () => {
    useRadioMetadata();
    return null;
};

export const RadioMetadataHook = () => {
    const isRadioActive = useIsRadioActive();

    if (!isRadioActive) {
        return null;
    }

    return React.createElement(RadioMetadataHookInner);
};
